'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const initSqlJs = require('@gemini-testing/sql.js');
const {zipSync} = require('fflate');
const childProcess = require('child_process');
const publish = require('../../../scripts/demo/publish');
const {validate} = require('../../../scripts/demo/check-report');

const SHA = 'a'.repeat(40);

async function createReport(directory) {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    db.run('CREATE TABLE suites (suitePath TEXT, name TEXT, status TEXT, error TEXT, imagesInfo TEXT, attachments TEXT)');
    db.run('INSERT INTO suites VALUES (?, ?, ?, ?, ?, ?)', [
        JSON.stringify(['testplane', 'sample']), 'chrome', 'success', null, '[]',
        JSON.stringify([{type: 0, path: 'snapshots/record.zip'}])
    ]);
    fs.writeFileSync(path.join(directory, 'sqlite.db'), Buffer.from(db.export()));
    db.close();
    for (const name of ['new-ui.html', 'newReport.min.js', 'sql-wasm.js', 'sql-wasm.wasm']) {
        fs.writeFileSync(path.join(directory, name), 'ok');
    }
    fs.writeFileSync(path.join(directory, 'databaseUrls.json'), JSON.stringify({dbUrls: ['sqlite.db'], jsonUrls: []}));
    fs.mkdirSync(path.join(directory, 'snapshots'));
    fs.writeFileSync(path.join(directory, 'snapshots/record.zip'), Buffer.from(zipSync({'snapshot.json': Buffer.from('{}')})));
    const oracle = path.join(directory, 'oracle.json');
    fs.writeFileSync(oracle, JSON.stringify({tests: [{
        suitePath: ['testplane', 'sample'], browser: 'chrome', attempts: [{
            browser: 'chrome', status: 'success', error: null, images: [],
            attachments: [{type: 0, extension: 'zip'}]
        }]
    }]}));
    return oracle;
}

describe('demo report checker', () => {
    let report;
    let oracle;

    beforeEach(async () => {
        report = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-checker-'));
        oracle = await createReport(report);
    });

    afterEach(() => fs.rmSync(report, {recursive: true, force: true}));

    it('validates the report and local Time Travel asset', async () => {
        const assets = await validate(report, oracle);
        assert.include(assets, 'sqlite.db');
        assert.include(assets, 'snapshots/record.zip');
    });

    it('rejects missing or corrupt Time Travel assets', async () => {
        const zip = path.join(report, 'snapshots/record.zip');
        fs.writeFileSync(zip, 'broken');
        await assert.isRejected(validate(report, oracle), /invalid ZIP asset/);
        fs.rmSync(zip);
        await assert.isRejected(validate(report, oracle), /missing or empty asset/);
    });

    it('rejects external database references', async () => {
        fs.writeFileSync(path.join(report, 'databaseUrls.json'), JSON.stringify({dbUrls: ['https://example.com/db'], jsonUrls: []}));
        await assert.isRejected(validate(report, oracle), /databaseUrls.json/);
    });

    it('rejects changed status', async () => {
        const SQL = await initSqlJs();
        const db = new SQL.Database(fs.readFileSync(path.join(report, 'sqlite.db')));
        db.run('UPDATE suites SET status = \'fail\'');
        fs.writeFileSync(path.join(report, 'sqlite.db'), Buffer.from(db.export()));
        db.close();
        await assert.isRejected(validate(report, oracle), /semantic oracle mismatch/);
    });

    it('rejects an extra attempt', async () => {
        const SQL = await initSqlJs();
        const db = new SQL.Database(fs.readFileSync(path.join(report, 'sqlite.db')));
        db.run('INSERT INTO suites SELECT * FROM suites');
        fs.writeFileSync(path.join(report, 'sqlite.db'), Buffer.from(db.export()));
        db.close();
        await assert.isRejected(validate(report, oracle), /semantic oracle mismatch/);
    });

    it('rejects a missing referenced image', async () => {
        const SQL = await initSqlJs();
        const db = new SQL.Database(fs.readFileSync(path.join(report, 'sqlite.db')));
        db.run('UPDATE suites SET imagesInfo = ?', [JSON.stringify([{
            stateName: 'button', status: 'success', expectedImg: {path: 'images/missing.png'}
        }])]);
        fs.writeFileSync(path.join(report, 'sqlite.db'), Buffer.from(db.export()));
        db.close();
        await assert.isRejected(validate(report, oracle), /missing or empty asset/);
    });

    it('rejects escaping asset paths', async () => {
        const SQL = await initSqlJs();
        const db = new SQL.Database(fs.readFileSync(path.join(report, 'sqlite.db')));
        db.run('UPDATE suites SET attachments = ?', [JSON.stringify([{type: 0, path: '../secret.zip'}])]);
        fs.writeFileSync(path.join(report, 'sqlite.db'), Buffer.from(db.export()));
        db.close();
        await assert.isRejected(validate(report, oracle), /unsafe asset path/);
    });
});

describe('demo publication', () => {
    let calls;
    let originalFetch;
    let masterSha;

    beforeEach(() => {
        calls = [];
        masterSha = SHA;
        originalFetch = global.fetch;
        global.fetch = async (url, options) => {
            calls.push(['probe', url, options.method]);
            return {ok: true, status: 200, headers: {get: () => '100'}};
        };
        sinon.stub(childProcess, 'execFileSync').callsFake((command, args) => {
            if (command === 'git') {
                calls.push(['master']);
                return `${masterSha}\trefs/heads/master\n`;
            }
            if (command === 'aws') {
                calls.push(['aws', args, args.includes('--body') ? fs.readFileSync(args[args.indexOf('--body') + 1], 'utf8') : null]);
                return Buffer.alloc(0);
            }
            throw new Error(command);
        });
    });

    afterEach(() => {
        childProcess.execFileSync.restore();
        global.fetch = originalFetch;
    });

    it('constructs an immutable revision and preserves query/hash in redirect', () => {
        const prefix = publish.revisionPrefix(SHA, '123', '2');
        assert.equal(prefix, `live/revisions/${SHA}-123-2`);
        assert.include(publish.redirectHtml(prefix), 'location.search + location.hash');
        assert.throws(() => publish.revisionPrefix('bad', '123', '2'));
    });

    it('uploads all files to a revision without delete', () => {
        publish.stage('/tmp/report', 'live/revisions/abc');
        assert.deepEqual(calls[0][1].slice(0, 5), ['--endpoint-url', 'https://s3.yandexcloud.net', 's3', 'cp', '/tmp/report/']);
        assert.include(calls[0][1], 's3://testplane-ui-demo/live/revisions/abc/');
        assert.notInclude(calls[0][1], '--delete');
    });

    it('probes public files before one latest switch', async () => {
        await publish.activate('live/revisions/abc', ['sqlite.db'], SHA);
        assert.deepEqual(calls.map(call => call[0]), ['probe', 'master', 'aws']);
        assert.include(calls[2][1], 'live/latest/new-ui.html');
        assert.include(calls[2][2], 'location.search + location.hash');
    });

    it('does not switch latest if master advanced', async () => {
        masterSha = 'b'.repeat(40);
        await assert.isRejected(publish.activate('live/revisions/abc', ['sqlite.db'], SHA), /master advanced/);
        assert.deepEqual(calls.map(call => call[0]), ['probe', 'master']);
    });

    it('does not switch latest if public probe fails', async () => {
        global.fetch = async () => ({ok: false, status: 404, headers: {get: () => null}});
        await assert.isRejected(publish.activate('live/revisions/abc', ['sqlite.db'], SHA), /public asset unavailable/);
        assert.isEmpty(calls);
    });
});
