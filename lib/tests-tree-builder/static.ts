import _ from 'lodash';
import {BaseTestsTreeBuilder, BaseTestsTreeBuilderOptions, Tree} from './base';
import {BrowserVersions, DB_COLUMN_INDEXES, TestStatus} from '../constants';
import {ReporterTestResult} from '../adapters/test-result';
import {SqliteTestResultAdapter} from '../adapters/test-result/sqlite';
import {getTitleDelimiter} from '../common-utils';
import {RawSuitesRow} from '../types';

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

            const formattedResult = new SqliteTestResultAdapter(row, attempt, {titleDelimiter: getTitleDelimiter(this._toolName)});

            addBrowserVersion(browsers, formattedResult);

            this.addTestResult(formattedResult);
            this._calcStats(formattedResult, {testId, browserName});
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

    protected _calcStats(testResult: ReporterTestResult, {testId, browserName}: { testId: string; browserName: string }): void {
        const testIdWithBrowser = this._buildId(testId, browserName);
        const {status} = testResult;
        const {browserVersion} = testResult.meta;
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

function addBrowserVersion(browsers: Record<string, Set<string>>, testResult: ReporterTestResult): void {
    const {browserId} = testResult;

    if (!browsers[browserId]) {
        browsers[browserId] = new Set();
    }

    const {browserVersion = BrowserVersions.UNKNOWN} = testResult.meta;
    browsers[browserId].add(browserVersion);
}
