'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const initSqlJs = require('@gemini-testing/sql.js');
const {unzipSync} = require('fflate');

const REQUIRED = ['sqlite.db', 'new-ui.html', 'databaseUrls.json', 'newReport.min.js', 'sql-wasm.js', 'sql-wasm.wasm'];
const IMAGE_KINDS = ['refImg', 'expectedImg', 'actualImg', 'diffImg'];
const ORACLE = path.join(__dirname, 'oracle.json');

function requireAsset(report, value) {
    const asset = value?.path;
    if (!asset || path.isAbsolute(asset) || asset.split(/[\\/]/).includes('..')) {
        throw new Error(`unsafe asset path: ${asset}`);
    }
    const target = path.resolve(report, asset);
    if (!target.startsWith(`${path.resolve(report)}${path.sep}`)) {
        throw new Error(`unsafe asset path: ${asset}`);
    }
    const stat = fs.statSync(target, {throwIfNoEntry: false});
    if (!stat?.isFile() || !stat.size) {
        throw new Error(`missing or empty asset: ${target}`);
    }
    if (target.endsWith('.png') && !fs.readFileSync(target).subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
        throw new Error(`invalid PNG asset: ${target}`);
    }
    if (target.endsWith('.zip')) {
        try {
            if (!Object.keys(unzipSync(fs.readFileSync(target))).length) {
                throw new Error(`empty ZIP asset: ${target}`);
            }
        } catch (error) {
            throw new Error(`invalid ZIP asset: ${target}`, {cause: error});
        }
    }
    return asset.replaceAll('\\', '/');
}

function listFiles(directory, prefix = '') {
    return fs.readdirSync(path.join(directory, prefix), {withFileTypes: true}).flatMap(entry => {
        const name = path.posix.join(prefix, entry.name);
        if (entry.isDirectory()) {
            return listFiles(directory, name);
        }
        if (!entry.isFile()) {
            throw new Error(`unexpected report entry: ${name}`);
        }
        return [name];
    });
}

async function summarize(report) {
    const root = path.resolve(report);
    const assets = new Set(REQUIRED.map(asset => requireAsset(root, {path: asset})));
    const urls = JSON.parse(fs.readFileSync(path.join(root, 'databaseUrls.json')));
    if (!util.isDeepStrictEqual(urls.dbUrls, ['sqlite.db']) || !util.isDeepStrictEqual(urls.jsonUrls, [])) {
        throw new Error('databaseUrls.json does not point exclusively to local sqlite.db');
    }
    const SQL = await initSqlJs();
    const db = new SQL.Database(fs.readFileSync(path.join(root, 'sqlite.db')));
    let rows;
    try {
        const result = db.exec('SELECT suitePath, name, status, error, imagesInfo, attachments FROM suites ORDER BY rowid');
        rows = result[0]?.values || [];
    } finally {
        db.close();
    }
    const tests = new Map();
    for (const [suite, browser, status, error, imagesInfo, attachments] of rows) {
        const suitePath = JSON.parse(suite);
        const images = JSON.parse(imagesInfo || '[]').map(image => {
            const kinds = IMAGE_KINDS.filter(kind => image[kind]);
            for (const kind of kinds) {
                if (kind !== 'refImg') {
                    assets.add(requireAsset(root, image[kind]));
                }
            }
            return {stateName: image.stateName ?? null, status: image.status, kinds};
        });
        const attachmentSummary = JSON.parse(attachments || '[]').flatMap(attachment => {
            if (attachment.type === 1 && util.isDeepStrictEqual(attachment.list, [])) {
                return [];
            }
            const asset = requireAsset(root, attachment);
            assets.add(asset);
            if (attachment.type !== 0 || !asset.endsWith('.zip')) {
                throw new Error(`expected Time Travel ZIP: ${asset}`);
            }
            return [{type: attachment.type, extension: 'zip'}];
        });
        const parsedError = error ? JSON.parse(error) : null;
        const key = JSON.stringify([suitePath, browser]);
        if (!tests.has(key)) {
            tests.set(key, {suitePath, browser, attempts: []});
        }
        tests.get(key).attempts.push({
            browser,
            status,
            error: parsedError ? {name: parsedError.name, message: parsedError.message} : null,
            images,
            attachments: attachmentSummary
        });
    }
    for (const file of listFiles(root)) {
        assets.add(requireAsset(root, {path: file}));
    }
    return {tests: [...tests.values()], assets: [...assets].sort()};
}

async function validate(report, oracle = ORACLE) {
    const {tests, assets} = await summarize(report);
    const expected = JSON.parse(fs.readFileSync(oracle));
    const actualByKey = new Map(tests.map(test => [JSON.stringify([test.suitePath, test.browser]), test.attempts]));
    const expectedByKey = new Map(expected.tests.map(test => [JSON.stringify([test.suitePath, test.browser]), test.attempts]));
    for (const key of new Set([...actualByKey.keys(), ...expectedByKey.keys()])) {
        if (!util.isDeepStrictEqual(actualByKey.get(key), expectedByKey.get(key))) {
            throw new Error(`semantic oracle mismatch for ${key}: actual=${JSON.stringify(actualByKey.get(key))} expected=${JSON.stringify(expectedByKey.get(key))}`);
        }
    }
    return assets;
}

async function main(args = process.argv.slice(2)) {
    const report = args[0];
    const output = args[1] === '--assets-output' ? args[2] : null;
    if (!report || (args.length !== 1 && (!output || args.length !== 3))) {
        throw new Error('Usage: node check-report.js REPORT [--assets-output FILE]');
    }
    const assets = await validate(report);
    if (output) {
        fs.writeFileSync(output, `${JSON.stringify(assets, null, 2)}\n`);
    }
    console.log(`Validated 21 tests, 25 attempts and ${assets.length} local report assets`);
}

if (require.main === module) {
    main().catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = {validate, summarize, requireAsset};
