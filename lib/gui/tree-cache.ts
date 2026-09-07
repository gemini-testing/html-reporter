import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {promisify} from 'node:util';
import {gzip, gunzip} from 'node:zlib';
import fs from 'fs-extra';
import {version} from '../../package.json';
import type {ServerArgs} from './index';
import type {ToolRunnerTree} from './tool-runner';
import {logger} from '../common-utils';

type Snapshot = Pick<ToolRunnerTree, 'tree' | 'skips' | 'timestamp' | 'date'>;
const compress = promisify(gzip);
const decompress = promisify(gunzip);

// The cache is only used for previewing tests, never for running them.
export class GuiTreeCache {
    private readonly _path: string;
    private readonly _key: string;

    constructor({paths, cli, toolAdapter}: ServerArgs) {
        this._path = path.resolve(toolAdapter.reporterConfig.path, '.gui-tree-cache.json.gz');
        const {config, grep, tag, set, browser, require: requires} = cli.tool || {};
        this._key = createHash('sha256').update(JSON.stringify({
            version, cwd: process.cwd(), tool: toolAdapter.toolName,
            paths, config, grep: grep?.toString(), tag, set, browser, requires,
            browserIds: toolAdapter.config.browserIds,
            baseHost: toolAdapter.reporterConfig.baseHost
        })).digest('hex');
    }

    async read(): Promise<Snapshot | null> {
        try {
            const {schema, key, snapshot} = JSON.parse((await decompress(await fs.readFile(this._path))).toString());
            if (schema !== 1 || key !== this._key || !Array.isArray(snapshot?.skips)) {
                return null;
            }
            for (const kind of ['suites', 'browsers', 'results', 'images']) {
                const nodes = snapshot.tree?.[kind];
                if (!Array.isArray(nodes?.allIds) || !nodes?.byId ||
                    nodes.allIds.some((id: string) => !nodes.byId[id])) {
                    return null;
                }
            }
            if (!Array.isArray(snapshot.tree.suites.allRootIds)) {
                return null;
            }
            return snapshot;
        } catch {
            // A missing, corrupt or outdated cache must not prevent normal startup.
            return null;
        }
    }

    async write(data: ToolRunnerTree | null): Promise<void> {
        if (!data) {
            return;
        }
        const temporaryPath = `${this._path}.${randomUUID()}.tmp`;
        try {
            const {tree, skips, timestamp, date} = data;
            const snapshot: Snapshot = {tree, skips, timestamp, date};
            const contents = await compress(JSON.stringify({schema: 1, key: this._key, snapshot}));
            await fs.outputFile(temporaryPath, contents);
            await fs.rename(temporaryPath, this._path);
        } catch (error) {
            logger.warn(`Could not save GUI tree cache: ${(error as Error).message}`);
        } finally {
            await fs.remove(temporaryPath).catch(() => undefined);
        }
    }
}
