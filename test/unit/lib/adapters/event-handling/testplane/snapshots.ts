import crypto from 'crypto';
import os from 'os';
import path from 'path';
import {unzipSync, strFromU8} from 'fflate';
import fs from 'fs-extra';
import type {NetworkRequestsData} from 'testplane/unstable';
import {finalizeSnapshotsForTest, handleDomSnapshotsEvent, handleNetworkRequestsEvent} from 'lib/adapters/event-handling/testplane/snapshots';

describe('lib/adapters/event-handling/testplane/snapshots', () => {
    const sandbox = sinon.createSandbox();
    const context = {testPath: ['suite', 'test'], browserId: 'chrome'};
    let reportPath: string;
    const request = (): NetworkRequestsData['requests'][number] => ({url: 'https://example.com', method: 'GET', headers: [], timestamp: 100});
    const snapshot = (): void => handleDomSnapshotsEvent(null, context, {
        rrwebSnapshots: [{type: 4, timestamp: 100, data: {width: 800, height: 600}}]
    });
    const finalize = (overrides = {}): ReturnType<typeof finalizeSnapshotsForTest> => finalizeSnapshotsForTest({
        testResult: {...context, imageDir: 'image-dir', timestamp: 1, history: [], duration: 0} as never,
        attempt: 0, reportPath, timeTravelConfig: {mode: 'on'} as never,
        events: {TEST_FAIL: 'fail'} as never, eventName: 'pass' as never,
        secretConfigFilter: null,
        ...overrides
    });
    const files = async (zipPath: string): Promise<Record<string, Uint8Array>> =>
        unzipSync(new Uint8Array(await fs.readFile(path.resolve(reportPath, zipPath))));
    const saveBody = async (body: Buffer): Promise<{bodyHash: string; bodyFilePath: string}> => {
        const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
        const bodyFilePath = path.join(reportPath, bodyHash);
        await fs.writeFile(bodyFilePath, body);
        return {bodyHash, bodyFilePath};
    };

    beforeEach(async () => {
        reportPath = await fs.mkdtemp(path.join(os.tmpdir(), 'html-reporter-network-'));
    });

    afterEach(async () => {
        await finalize({timeTravelConfig: {mode: 'last-failed-run'}});
        sandbox.restore();
        await fs.remove(reportPath);
    });

    it('should archive snapshots, masked metadata and distinct request/response bodies without duplicate files', async () => {
        const requestBody = Buffer.from('search=example');
        const responseBody = Buffer.from([0, 128, 255]);
        const req = {
            ...request(), method: 'POST', headers: [{name: 'Authorization', value: 'Bearer test-credential'}],
            ...await saveBody(requestBody),
            response: {
                status: 200, statusText: 'OK', timestamp: 110,
                headers: [{name: 'Set-Cookie', value: 'session=abc123'}],
                ...await saveBody(responseBody)
            }
        };
        const original = JSON.stringify(req);
        snapshot();
        handleNetworkRequestsEvent(context, {requests: [req, req]});

        const [attachment] = await finalize();
        const entries = await files(attachment.path);
        const saved = JSON.parse(strFromU8(entries['network.json']));

        const expected = {
            ...req, headers: [{name: 'Authorization', value: 'Beare...'}], bodyFilePath: `network/bodies/${req.bodyHash}`,
            response: {...req.response, headers: [{name: 'Set-Cookie', value: 'sessi...'}], bodyFilePath: `network/bodies/${req.response.bodyHash}`}
        };
        assert.deepEqual(saved, {version: 1, requests: [expected, expected]});
        assert.sameMembers(Object.keys(entries), ['snapshots.json', 'network.json', expected.bodyFilePath, expected.response.bodyFilePath]);
        assert.deepEqual(Buffer.from(entries[expected.bodyFilePath]), requestBody);
        assert.deepEqual(Buffer.from(entries[expected.response.bodyFilePath]), responseBody);
        assert.equal(JSON.stringify(req), original);
    });

    it('should extend default masking with a project filter even when there are no DOM snapshots', async () => {
        const req = {
            ...request(), headers: [{name: 'X-Account', value: 'account-123'}, {name: 'Accept', value: 'application/json'}],
            response: {status: 200, statusText: 'OK', timestamp: 110, headers: [{name: 'Set-Cookie', value: 'session=abc123'}]}
        };
        handleNetworkRequestsEvent(context, {requests: [req]});
        const secretConfigFilter = (_value: string, field: string): true | undefined =>
            field === 'network-request.header.X-Account' ? true : undefined;

        const [attachment] = await finalize({secretConfigFilter});
        const entries = await files(attachment.path);
        const [saved] = JSON.parse(strFromU8(entries['network.json'])).requests;

        assert.deepEqual(saved.headers, [{name: 'X-Account', value: 'accou...'}, {name: 'Accept', value: 'application/json'}]);
        assert.deepEqual(saved.response.headers, [{name: 'Set-Cookie', value: 'sessi...'}]);
        assert.equal(strFromU8(entries['snapshots.json']), '');
    });

    it('should preserve DOM-only archives', async () => {
        snapshot();

        const [attachment] = await finalize();
        const entries = await files(attachment.path);

        assert.deepEqual(Object.keys(entries), ['snapshots.json']);
        assert.include(JSON.parse(strFromU8(entries['snapshots.json'])), {type: 4, seqNo: 0, timestamp: 100});
    });

    it('should discard a passing recording without leaking requests into the next failed attempt', async () => {
        handleNetworkRequestsEvent(context, {requests: [request()]});
        const failed = {...request(), url: 'https://example.com/failed', failure: 'net::ERR_FAILED'};
        const timeTravelConfig = {mode: 'last-failed-run'};

        const discarded = await finalize({timeTravelConfig});
        handleNetworkRequestsEvent(context, {requests: [failed]});
        const [attachment] = await finalize({timeTravelConfig, eventName: 'fail'});
        const entries = await files(attachment.path);

        assert.isEmpty(discarded);
        assert.deepEqual(JSON.parse(strFromU8(entries['network.json'])).requests, [failed]);
    });

    it('should give a custom saver the complete archive', async () => {
        handleNetworkRequestsEvent(context, {requests: [request()]});
        const saveSnapshot = sandbox.stub().resolves('remote/snapshot.zip');

        const [attachment] = await finalize({snapshotsSaver: {saveSnapshot}});

        assert.equal(attachment.path, 'remote/snapshot.zip');
        assert.property(await files(saveSnapshot.firstCall.args[0]), 'network.json');
    });

    it('should warn and skip the archive when a body file is missing', async () => {
        const warn = sandbox.stub(console, 'warn');
        handleNetworkRequestsEvent(context, {requests: [{...request(), bodyHash: 'a'.repeat(64), bodyFilePath: path.join(reportPath, 'missing')}]});

        const attachments = await finalize();

        assert.isEmpty(attachments);
        assert.calledOnce(warn);
    });
});
