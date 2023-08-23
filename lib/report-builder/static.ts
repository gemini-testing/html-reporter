import _ from 'lodash';
import path from 'path';
import fs from 'fs-extra';
import type {default as Hermione} from 'hermione';

import {IDLE, RUNNING, SKIPPED, FAIL, ERROR, SUCCESS, TestStatus, LOCAL_DATABASE_NAME} from '../constants';
import {PreparedTestResult, SqliteAdapter} from '../sqlite-adapter';
import {TestAdapter} from '../test-adapter';
import {hasNoRefImageErrors} from '../static/modules/utils';
import {hasImage, saveStaticFilesToReportDir, writeDatabaseUrlsFile} from '../server-utils';
import {HtmlReporterApi, ReporterConfig, TestResult} from '../types';

const ignoredStatuses = [RUNNING, IDLE];

interface StaticReportBuilderOptions {
    reuse: boolean;
}

export class StaticReportBuilder {
    protected _hermione: Hermione & HtmlReporterApi;
    protected _pluginConfig: ReporterConfig;
    protected _sqliteAdapter: SqliteAdapter;

    static create<T extends StaticReportBuilder>(
        this: new (hermione: Hermione & HtmlReporterApi, pluginConfig: ReporterConfig, options?: Partial<StaticReportBuilderOptions>) => T,
        hermione: Hermione & HtmlReporterApi,
        pluginConfig: ReporterConfig,
        options?: Partial<StaticReportBuilderOptions>
    ): T {
        return new this(hermione, pluginConfig, options);
    }

    constructor(hermione: Hermione & HtmlReporterApi, pluginConfig: ReporterConfig, {reuse = false}: Partial<StaticReportBuilderOptions> = {}) {
        this._hermione = hermione;
        this._pluginConfig = pluginConfig;

        this._sqliteAdapter = SqliteAdapter.create({
            hermione: this._hermione,
            reportPath: this._pluginConfig.path,
            reuse
        });
    }

    async init(): Promise<void> {
        await this._sqliteAdapter.init();
    }

    format(result: TestResult | TestAdapter, status: TestStatus): TestAdapter {
        result.timestamp = Date.now();

        return result instanceof TestAdapter
            ? result
            : TestAdapter.create(result, {
                hermione: this._hermione,
                sqliteAdapter: this._sqliteAdapter,
                status
            });
    }

    async saveStaticFiles(): Promise<void> {
        const destPath = this._pluginConfig.path;

        await Promise.all([
            saveStaticFilesToReportDir(this._hermione, this._pluginConfig, destPath),
            writeDatabaseUrlsFile(destPath, [LOCAL_DATABASE_NAME])
        ]);
    }

    addSkipped(result: TestResult | TestAdapter): TestAdapter {
        const formattedResult = this.format(result, SKIPPED);

        return this._addTestResult(formattedResult, {
            status: SKIPPED,
            skipReason: formattedResult.suite.skipComment
        });
    }

    addSuccess(result: TestResult | TestAdapter): TestAdapter {
        return this._addTestResult(this.format(result, SUCCESS), {status: SUCCESS});
    }

    addFail(result: TestResult | TestAdapter): TestAdapter {
        return this._addFailResult(this.format(result, FAIL));
    }

    addError(result: TestResult | TestAdapter): TestAdapter {
        return this._addErrorResult(this.format(result, ERROR));
    }

    addRetry(result: TestResult | TestAdapter): TestAdapter {
        const formattedResult = this.format(result, FAIL);

        if (formattedResult.hasDiff()) {
            return this._addFailResult(formattedResult);
        } else {
            return this._addErrorResult(formattedResult);
        }
    }

    protected _addFailResult(formattedResult: TestAdapter): TestAdapter {
        return this._addTestResult(formattedResult, {status: FAIL});
    }

    protected _addErrorResult(formattedResult: TestAdapter): TestAdapter {
        return this._addTestResult(formattedResult, {status: ERROR, error: formattedResult.error});
    }

    protected _addTestResult(formattedResult: TestAdapter, props: {status: TestStatus} & Partial<PreparedTestResult>): TestAdapter {
        formattedResult.image = hasImage(formattedResult);

        const testResult = this._createTestResult(formattedResult, _.extend(props, {
            timestamp: formattedResult.timestamp
        }));

        if (hasNoRefImageErrors(formattedResult)) {
            testResult.status = FAIL;
        }

        if (!ignoredStatuses.includes(testResult.status)) {
            this._writeTestResultToDb(testResult, formattedResult);
        }

        return formattedResult;
    }

    _createTestResult(result: TestAdapter, props: {status: TestStatus} & Partial<PreparedTestResult>): PreparedTestResult {
        const {
            browserId, suite, sessionId, description, history,
            imagesInfo = [], screenshot, multipleTabs, errorDetails
        } = result;

        const {baseHost, saveErrorDetails} = this._pluginConfig;
        const suiteUrl: string = suite.getUrl({baseHost});
        const metaInfo = _.merge(_.cloneDeep(result.meta), {url: suite.fullUrl, file: suite.file, sessionId});

        const testResult: PreparedTestResult = Object.assign({
            suiteUrl, name: browserId, metaInfo, description, history,
            imagesInfo, screenshot: Boolean(screenshot), multipleTabs
        }, props);

        if (saveErrorDetails && errorDetails) {
            testResult.errorDetails = _.pick(errorDetails, ['title', 'filePath']);
        }

        return testResult;
    }

    _writeTestResultToDb(testResult: PreparedTestResult, formattedResult: TestAdapter): void {
        const {suite} = formattedResult;
        const suiteName = formattedResult.state.name;
        const suitePath = suite.path.concat(suiteName);

        this._sqliteAdapter.write({testResult, suitePath, suiteName});
    }

    _deleteTestResultFromDb(...args: Parameters<typeof this._sqliteAdapter.delete>): void {
        this._sqliteAdapter.delete(...args);
    }

    async finalize(): Promise<void> {
        this._sqliteAdapter.close();

        const reportsSaver = this._hermione.htmlReporter.reportsSaver;

        if (reportsSaver) {
            const reportDir = this._pluginConfig.path;
            const src = path.join(reportDir, LOCAL_DATABASE_NAME);
            const dbPath = await reportsSaver.saveReportData(src, {destPath: LOCAL_DATABASE_NAME, reportDir: reportDir});
            await writeDatabaseUrlsFile(reportDir, [dbPath]);
            await fs.remove(src);
        }
    }
}
