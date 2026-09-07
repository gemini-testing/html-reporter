import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import {gzipSync} from 'node:zlib';
import {GuiTreeCache} from 'lib/gui/tree-cache';
import {logger} from 'lib/common-utils';
import {stubToolAdapter} from 'test/unit/utils';
import type {ServerArgs} from 'lib/gui';
import type {ToolRunnerTree} from 'lib/gui/tool-runner';

describe('GUI tree cache', () => {
    let directory: string;
    let args: ServerArgs;
    const snapshot = {
        tree: {
            suites: {allIds: [], allRootIds: [], byId: {}},
            browsers: {allIds: [], byId: {}},
            results: {allIds: [], byId: {}},
            images: {allIds: [], byId: {}}
        },
        skips: [], timestamp: 123, date: 'date'
    };

    beforeEach(async () => {
        directory = await fs.mkdtemp(path.join(os.tmpdir(), 'gui-tree-cache-'));
        args = {
            paths: [],
            cli: {tool: {browser: ['chrome']}, options: {}},
            toolAdapter: stubToolAdapter({reporterConfig: {path: directory}})
        } as unknown as ServerArgs;
    });

    afterEach(async () => {
        await fs.remove(directory);
    });

    it('should save a snapshot without config or executable functions', async () => {
        const cache = new GuiTreeCache(args);
        await cache.write({...snapshot, config: {customGui: {initialize: () => undefined}}} as unknown as ToolRunnerTree);

        assert.deepEqual(await cache.read(), snapshot);
        assert.deepEqual(await fs.readdir(directory), ['.gui-tree-cache.json.gz']);
    });

    it('should not reuse a snapshot for a different set of files or browsers', async () => {
        await new GuiTreeCache(args).write(snapshot as unknown as ToolRunnerTree);
        assert.isNull(await new GuiTreeCache({...args, paths: ['other.ts']}).read());
        args.cli.tool.browser = ['firefox'];
        assert.isNull(await new GuiTreeCache(args).read());
    });

    it('should distinguish grep expressions with different flags', async () => {
        args.cli.tool.grep = /test/i;
        await new GuiTreeCache(args).write(snapshot as unknown as ToolRunnerTree);
        args.cli.tool.grep = /test/;
        assert.isNull(await new GuiTreeCache(args).read());
    });

    it('should return a cache miss when the snapshot is missing or corrupt', async () => {
        const cache = new GuiTreeCache(args);
        assert.isNull(await cache.read());
        await fs.writeFile(path.join(directory, '.gui-tree-cache.json.gz'), 'broken');
        assert.isNull(await cache.read());
        await fs.writeFile(path.join(directory, '.gui-tree-cache.json.gz'), gzipSync('{}'));
        assert.isNull(await cache.read());
    });

    it('should replace the entire snapshot even when the new tree is empty', async () => {
        const cache = new GuiTreeCache(args);
        await cache.write({...snapshot, skips: [{browser: 'chrome', suite: 'deleted test'}]} as unknown as ToolRunnerTree);
        await cache.write(snapshot as unknown as ToolRunnerTree);
        assert.deepEqual(await cache.read(), snapshot);
    });

    it('should preserve the previous snapshot without throwing when writing fails', async () => {
        const cache = new GuiTreeCache(args);
        await cache.write(snapshot as unknown as ToolRunnerTree);
        const sandbox = sinon.createSandbox();
        try {
            sandbox.stub(fs, 'outputFile').rejects(new Error('disk full'));
            const warn = sandbox.stub(logger, 'warn');
            await cache.write({...snapshot, timestamp: 456} as unknown as ToolRunnerTree);
            assert.calledOnce(warn);
            assert.deepEqual(await cache.read(), snapshot);
            assert.deepEqual(await fs.readdir(directory), ['.gui-tree-cache.json.gz']);
        } finally {
            sandbox.restore();
        }
    });
});
