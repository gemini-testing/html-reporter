import path from 'node:path';
import crypto from 'node:crypto';
import _ from 'lodash';

import type {ConfigAdapter} from './index';
import type {FullConfig, FullProject} from '@playwright/test/reporter';
import type {TestAdapter} from '../test';

export type PwtProject = FullProject & {
    snapshotPathTemplate?: string;
};

export type PwtConfig = FullConfig & {
    testDir?: string;
    snapshotDir?: string;
    snapshotPathTemplate?: string;
    projects?: PwtProject[]
}

export const DEFAULT_BROWSER_ID = 'chromium';
const DEFAULT_SNAPSHOT_PATH_TEMPLATE = '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{-snapshotSuffix}{ext}';

export class PlaywrightConfigAdapter implements ConfigAdapter {
    private _config: PwtConfig;
    private _browserIds: string[];

    static create<T extends PlaywrightConfigAdapter>(this: new (config: PwtConfig) => T, config: PwtConfig): T {
        return new this(config);
    }

    constructor(config: PwtConfig) {
        this._config = config;
        this._browserIds = _.isEmpty(this._config.projects) ? [DEFAULT_BROWSER_ID] : this._config.projects.map(prj => prj.name).filter(Boolean);
    }

    get original(): PwtConfig {
        return this._config;
    }

    get tolerance(): number {
        return 2.3;
    }

    get antialiasingTolerance(): number {
        return 4;
    }

    get browserIds(): string[] {
        return this._browserIds;
    }

    // used from pwt - https://github.com/microsoft/playwright/blob/v1.45.1/packages/playwright/src/worker/testInfo.ts#L452-L473
    getScreenshotPath(test: TestAdapter, stateName: string): string {
        const subPath = `${stateName}.png`;
        const parsedSubPath = path.parse(subPath);
        const parsedRelativeTestFilePath = path.parse(test.file);

        const currProject = (this._config.projects || []).find(prj => prj.name === test.browserId) as PwtProject || {};
        const projectNamePathSegment = sanitizeForFilePath(test.browserId);

        const snapshotPathTemplate = currProject.snapshotPathTemplate || this._config.snapshotPathTemplate || DEFAULT_SNAPSHOT_PATH_TEMPLATE;

        const testDir = path.resolve(currProject.testDir || this._config.testDir || '');
        let snapshotDir = currProject.snapshotDir || this._config.snapshotDir;
        snapshotDir = snapshotDir ? path.resolve(snapshotDir) : testDir;

        const snapshotSuffix = process.platform;

        const snapshotPath = snapshotPathTemplate
            .replace(/\{(.)?testDir\}/g, '$1' + testDir)
            .replace(/\{(.)?snapshotDir\}/g, '$1' + snapshotDir)
            .replace(/\{(.)?snapshotSuffix\}/g, snapshotSuffix ? '$1' + snapshotSuffix : '')
            .replace(/\{(.)?testFileDir\}/g, '$1' + parsedRelativeTestFilePath.dir)
            .replace(/\{(.)?platform\}/g, '$1' + process.platform)
            .replace(/\{(.)?projectName\}/g, projectNamePathSegment ? '$1' + projectNamePathSegment : '')
            .replace(/\{(.)?testName\}/g, '$1' + fsSanitizedTestName(test.titlePath))
            .replace(/\{(.)?testFileName\}/g, '$1' + parsedRelativeTestFilePath.base)
            .replace(/\{(.)?testFilePath\}/g, '$1' + test.file)
            .replace(/\{(.)?arg\}/g, '$1' + path.join(parsedSubPath.dir, parsedSubPath.name))
            .replace(/\{(.)?ext\}/g, parsedSubPath.ext ? '$1' + parsedSubPath.ext : '');

        return path.normalize(path.resolve(snapshotPath));
    }
}

function sanitizeForFilePath(s: string): string {
    // eslint-disable-next-line no-control-regex
    return s.replace(/[\x00-\x2C\x2E-\x2F\x3A-\x40\x5B-\x60\x7B-\x7F]+/g, '-');
}

function fsSanitizedTestName(titlePath: string[]): string {
    const fullTitleWithoutSpec = titlePath.join(' ');

    return sanitizeForFilePath(trimLongString(fullTitleWithoutSpec));
}

function trimLongString(s: string, length = 100): string {
    if (s.length <= length) {
        return s;
    }

    const hash = calculateSha1(s);
    const middle = `-${hash.substring(0, 5)}-`;
    const start = Math.floor((length - middle.length) / 2);
    const end = length - middle.length - start;

    return s.substring(0, start) + middle + s.slice(-end);
}

function calculateSha1(buffer: Buffer | string): string {
    const hash = crypto.createHash('sha1');
    hash.update(buffer);

    return hash.digest('hex');
}
