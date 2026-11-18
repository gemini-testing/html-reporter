'use strict';

const assert = require('node:assert/strict');
const {execFile} = require('node:child_process');
const {once} = require('node:events');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const {after, before, it} = require('node:test');
const {promisify} = require('node:util');
const initSqlJs = require('@gemini-testing/sql.js');
const {strFromU8, unzipSync} = require('fflate');
const {AttachmentType} = require('../../../../build/lib/types');

const run = promisify(execFile);
const fixtureDir = path.join(__dirname, 'fixture');
const testplaneBin = path.resolve(path.dirname(require.resolve('testplane')), '../../bin/testplane');

const server = http.createServer(async (request, response) => {
    if (request.url === '/echo') {
        let body = '';
        for await (const chunk of request.setEncoding('utf8')) {
            body += chunk;
        }
        response.end(`received ${body}`);
    } else if (request.url === '/') {
        response.setHeader('Content-Type', 'text/html');
        response.end('<!doctype html><body>Network fixture</body>');
    } else {
        response.end('ok');
    }
});

before(async () => {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
});

after(async () => {
    await server[Symbol.asyncDispose]();
});

async function runFixture(test, {browser = 'chrome', mode = 'on', grep = 'captures a request', exitCode = 0} = {}) {
    const reportPath = await fs.mkdtemp(path.join(os.tmpdir(), 'html-reporter-network-e2e-'));
    test.after(() => fs.rm(reportPath, {recursive: true, force: true}));

    let actualExitCode = 0;
    try {
        await run(process.execPath, [testplaneBin, '--browser', browser, '--grep', grep], {
            cwd: fixtureDir,
            env: {
                ...process.env,
                NETWORK_E2E_URL: `http://127.0.0.1:${server.address().port}`,
                NETWORK_E2E_MODE: mode,
                NETWORK_E2E_REPORT: reportPath
            },
            timeout: 150000
        });
    } catch (error) {
        if (error.code !== exitCode) {
            throw error;
        }
        actualExitCode = error.code;
    }
    assert.equal(actualExitCode, exitCode);

    const {Database} = await initSqlJs();
    const db = new Database(await fs.readFile(path.join(reportPath, 'sqlite.db')));
    try {
        return db.exec('SELECT suiteName, status, attachments FROM suites ORDER BY suiteName, rowid')[0].values
            .map(([name, status, attachments]) => {
                const snapshot = JSON.parse(attachments).find(({type}) => type === AttachmentType.Snapshot);
                return {name, status, snapshot: snapshot && path.join(reportPath, snapshot.path)};
            });
    } finally {
        db.close();
    }
}

const openSnapshot = async result => unzipSync(await fs.readFile(result.snapshot));
const readRequests = entries => JSON.parse(strFromU8(entries['network.json'])).requests;

it('saves redacted headers and complete bodies in the report attachment', async test => {
    const [result] = await runFixture(test);
    assert.equal(result.status, 'success');

    const entries = await openSnapshot(result);
    const echo = readRequests(entries).find(({url}) => new URL(url).pathname === '/echo');

    assert.equal(echo.headers.find(({name}) => name.toLowerCase() === 'x-fixture-account').value, '[redacted]');
    assert.equal(strFromU8(entries[echo.bodyFilePath]), 'fixture payload');
    assert.equal(strFromU8(entries[echo.response.bodyFilePath]), 'received fixture payload');
});

it('saves network data only for the terminal failure in last-failed-run mode', async test => {
    const results = await runFixture(test, {mode: 'last-failed-run', grep: 'retention', exitCode: 1});
    assert.deepEqual(results.map(({name, status, snapshot}) => [name, status, Boolean(snapshot)]), [
        ['fails', 'error', false],
        ['fails', 'error', true],
        ['passes', 'success', false]
    ]);

    const entries = await openSnapshot(results[1]);
    const markers = readRequests(entries)
        .map(({url}) => new URL(url).pathname)
        .filter(pathname => pathname.startsWith('/attempt/'));
    assert.deepEqual(markers, ['/attempt/1']);
});

it('saves DOM snapshots without network data in Firefox', async test => {
    const [result] = await runFixture(test, {browser: 'firefox'});
    assert.equal(result.status, 'success');

    const entries = await openSnapshot(result);
    assert.deepEqual(Object.keys(entries), ['snapshots.json']);
    assert.ok(strFromU8(entries['snapshots.json']).trim());
});
