import _ from 'lodash';
import {BaseTestsTreeBuilder, BaseTestsTreeBuilderOptions, Tree} from './base';
import {BrowserVersions, DB_COLUMN_INDEXES, TestStatus} from '../constants';
import {Attempt, ParsedSuitesRow, RawSuitesRow} from '../types';

interface Stats {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    retries: number;
}

type FinalStats = Stats & {
    perBrowser: {
        [browserName: string]: {
            [browserVersion: string]: Stats
        }
    }
}

export interface SkipItem {
    browser: string;
    suite: string;
    comment?: string;
}

interface BrowserItem {
    id: string;
    versions: string[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StaticTestsTreeBuilderOptions extends BaseTestsTreeBuilderOptions {}

export class StaticTestsTreeBuilder extends BaseTestsTreeBuilder {
    protected _stats: FinalStats;
    protected _skips: SkipItem[];
    protected _failedTestIds: { [key: string]: boolean };
    protected _passedTestIds: { [key: string]: boolean };
    protected _skippedTestIds: { [key: string]: boolean };

    constructor(options: StaticTestsTreeBuilderOptions) {
        super(options);

        this._stats = {
            ...initStats(),
            perBrowser: {}
        };
        this._skips = [];
        this._failedTestIds = {};
        this._passedTestIds = {};
        this._skippedTestIds = {};
    }

    build(rows: RawSuitesRow[] = []): { tree: Tree; stats: FinalStats; skips: SkipItem[]; browsers: BrowserItem[] } {
        const attemptsMap = new Map<string, number>();
        const browsers: Record<string, Set<string>> = {};

        for (const row of rows) {
            const testPath: string[] = JSON.parse(row[DB_COLUMN_INDEXES.suitePath] as string);
            const browserName = row[DB_COLUMN_INDEXES.name] as string;

            const testId = this._buildId(testPath);
            const browserId = this._buildId(testId, browserName);

            attemptsMap.set(browserId, attemptsMap.has(browserId) ? attemptsMap.get(browserId) as number + 1 : 0);
            const attempt = attemptsMap.get(browserId) as number;

            const testResult = mkTestResult(row, {attempt});
            const formattedResult = {browserId: browserName, testPath, attempt};

            addBrowserVersion(browsers, testResult);

            this.addTestResult(testResult, formattedResult);
            this._calcStats(testResult, {testId, browserName});
        }

        this.sortTree();

        return {
            tree: this.tree,
            stats: this._stats,
            skips: this._skips,
            browsers: _.map(browsers, (versions, id) => ({id, versions: Array.from(versions)}))
        };
    }

    protected _addResultIdToBrowser(browserId: string, testResultId: string): void {
        this._tree.browsers.byId[browserId].resultIds.push(testResultId);
    }

    protected _calcStats(testResult: ParsedSuitesRow, {testId, browserName}: { testId: string; browserName: string }): void {
        const testIdWithBrowser = this._buildId(testId, browserName);
        const {status} = testResult;
        const {browserVersion} = testResult.metaInfo;
        const version = browserVersion || BrowserVersions.UNKNOWN;

        if (!this._stats.perBrowser[browserName]) {
            this._stats.perBrowser[browserName] = {};
        }

        if (!this._stats.perBrowser[browserName][version]) {
            this._stats.perBrowser[browserName][version] = initStats();
        }

        switch (status) {
            case TestStatus.FAIL:
            case TestStatus.ERROR: {
                if (this._failedTestIds[testIdWithBrowser]) {
                    this._stats.retries++;
                    this._stats.perBrowser[browserName][version].retries++;
                    return;
                }

                this._failedTestIds[testIdWithBrowser] = true;
                this._stats.failed++;
                this._stats.total++;
                this._stats.perBrowser[browserName][version].failed++;
                this._stats.perBrowser[browserName][version].total++;
                return;
            }

            case TestStatus.SUCCESS: {
                if (this._passedTestIds[testIdWithBrowser]) {
                    this._stats.retries++;
                    this._stats.perBrowser[browserName][version].retries++;
                    return;
                }

                if (this._failedTestIds[testIdWithBrowser]) {
                    delete this._failedTestIds[testIdWithBrowser];
                    this._stats.failed--;
                    this._stats.passed++;
                    this._stats.retries++;
                    this._stats.perBrowser[browserName][version].failed--;
                    this._stats.perBrowser[browserName][version].passed++;
                    this._stats.perBrowser[browserName][version].retries++;

                    return;
                }

                this._passedTestIds[testIdWithBrowser] = true;
                this._stats.passed++;
                this._stats.total++;
                this._stats.perBrowser[browserName][version].passed++;
                this._stats.perBrowser[browserName][version].total++;

                return;
            }

            case TestStatus.SKIPPED: {
                if (this._skippedTestIds[testIdWithBrowser]) {
                    this._stats.retries++;
                    this._stats.perBrowser[browserName][version].retries++;
                    return;
                }

                this._skippedTestIds[testIdWithBrowser] = true;

                this._skips.push({
                    browser: browserName,
                    suite: testId,
                    comment: testResult.skipReason
                });

                this._stats.skipped++;
                this._stats.perBrowser[browserName][version].skipped++;

                if (this._failedTestIds[testIdWithBrowser]) {
                    delete this._failedTestIds[testIdWithBrowser];
                    this._stats.failed--;
                    this._stats.perBrowser[browserName][version].failed--;
                    return;
                }

                this._stats.total++;
                this._stats.perBrowser[browserName][version].total++;
            }
        }
    }
}

function initStats(): Stats {
    return {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        retries: 0
    };
}

function mkTestResult(row: RawSuitesRow, data: {attempt: number}): ParsedSuitesRow & Attempt {
    return {
        description: row[DB_COLUMN_INDEXES.description] as string | null,
        imagesInfo: JSON.parse(row[DB_COLUMN_INDEXES.imagesInfo] as string),
        metaInfo: JSON.parse(row[DB_COLUMN_INDEXES.metaInfo] as string),
        history: JSON.parse(row[DB_COLUMN_INDEXES.history] as string),
        multipleTabs: Boolean(row[DB_COLUMN_INDEXES.multipleTabs]),
        name: row[DB_COLUMN_INDEXES.name] as string,
        screenshot: Boolean(row[DB_COLUMN_INDEXES.screenshot]),
        status: row[DB_COLUMN_INDEXES.status] as TestStatus,
        suiteUrl: row[DB_COLUMN_INDEXES.suiteUrl] as string,
        skipReason: row[DB_COLUMN_INDEXES.skipReason] as string,
        error: JSON.parse(row[DB_COLUMN_INDEXES.error] as string),
        timestamp: Number(row[DB_COLUMN_INDEXES.timestamp]),
        ...data
    };
}

function addBrowserVersion(browsers: Record<string, Set<string>>, testResult: ParsedSuitesRow): void {
    const browserId = testResult.name;

    if (!browsers[browserId]) {
        browsers[browserId] = new Set();
    }

    const {browserVersion = BrowserVersions.UNKNOWN} = testResult.metaInfo;
    browsers[browserId].add(browserVersion);
}
