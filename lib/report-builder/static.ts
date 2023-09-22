import path from 'path';
import {GeneralEventEmitter} from 'eventemitter2';
import _ from 'lodash';
import fs from 'fs-extra';

import {
    IDLE,
    RUNNING,
    SKIPPED,
    FAIL,
    ERROR,
    SUCCESS,
    TestStatus,
    LOCAL_DATABASE_NAME,
    PluginEvents
} from '../constants';
import {PreparedTestResult, SqliteAdapter} from '../sqlite-adapter';
import {ReporterTestResult} from '../test-adapter';
import {hasNoRefImageErrors} from '../static/modules/utils';
import {hasImage, saveStaticFilesToReportDir, writeDatabaseUrlsFile} from '../server-utils';
import {ReporterConfig} from '../types';
import {HtmlReporter} from '../plugin-api';
import {ImageHandler} from '../image-handler';
import {SqliteImageStore} from '../image-store';
import {getAbsoluteUrl, getError, getRelativeUrl, hasDiff} from '../common-utils';
import {getTestFromDb} from '../db-utils/server';

const ignoredStatuses = [RUNNING, IDLE];

interface StaticReportBuilderOptions {
    reuse: boolean;
}

export class StaticReportBuilder {
    protected _htmlReporter: HtmlReporter;
    protected _pluginConfig: ReporterConfig;
    protected _sqliteAdapter: SqliteAdapter;
    protected _imageHandler: ImageHandler;

    static create<T extends StaticReportBuilder>(
        this: new (htmlReporter: HtmlReporter, pluginConfig: ReporterConfig, options?: Partial<StaticReportBuilderOptions>) => T,
        htmlReporter: HtmlReporter,
        pluginConfig: ReporterConfig,
        options?: Partial<StaticReportBuilderOptions>
    ): T {
        return new this(htmlReporter, pluginConfig, options);
    }

    constructor(htmlReporter: HtmlReporter, pluginConfig: ReporterConfig, {reuse = false}: Partial<StaticReportBuilderOptions> = {}) {
        this._htmlReporter = htmlReporter;
        this._pluginConfig = pluginConfig;

        this._sqliteAdapter = SqliteAdapter.create({
            htmlReporter: this._htmlReporter,
            reportPath: this._pluginConfig.path,
            reuse
        });

        const imageStore = new SqliteImageStore(this._sqliteAdapter);
        this._imageHandler = new ImageHandler(imageStore, htmlReporter.imagesSaver, {reportPath: pluginConfig.path});

        this._htmlReporter.on(PluginEvents.IMAGES_SAVER_UPDATED, (newImagesSaver) => {
            this._imageHandler.setImagesSaver(newImagesSaver);
        });

        this._htmlReporter.listenTo(this._imageHandler as unknown as GeneralEventEmitter, [PluginEvents.TEST_SCREENSHOTS_SAVED]);
    }

    get imageHandler(): ImageHandler {
        return this._imageHandler;
    }

    async init(): Promise<void> {
        await this._sqliteAdapter.init();
    }

    async saveStaticFiles(): Promise<void> {
        const destPath = this._pluginConfig.path;

        await Promise.all([
            saveStaticFilesToReportDir(this._htmlReporter, this._pluginConfig, destPath),
            writeDatabaseUrlsFile(destPath, [LOCAL_DATABASE_NAME])
        ]);
    }

    addSkipped(result: ReporterTestResult): ReporterTestResult {
        return this._addTestResult(result, {
            status: SKIPPED,
            skipReason: result.skipReason
        });
    }

    addSuccess(result: ReporterTestResult): ReporterTestResult {
        return this._addTestResult(result, {status: SUCCESS});
    }

    addFail(result: ReporterTestResult): ReporterTestResult {
        return this._addFailResult(result);
    }

    addError(result: ReporterTestResult): ReporterTestResult {
        return this._addErrorResult(result);
    }

    addRetry(result: ReporterTestResult): ReporterTestResult {
        if (hasDiff(result.assertViewResults)) {
            return this._addFailResult(result);
        } else {
            return this._addErrorResult(result);
        }
    }

    protected _addFailResult(formattedResult: ReporterTestResult): ReporterTestResult {
        return this._addTestResult(formattedResult, {status: FAIL});
    }

    protected _addErrorResult(formattedResult: ReporterTestResult): ReporterTestResult {
        return this._addTestResult(formattedResult, {status: ERROR});
    }

    protected _addTestResult(formattedResult: ReporterTestResult, props: {status: TestStatus} & Partial<PreparedTestResult>): ReporterTestResult {
        formattedResult.image = hasImage(formattedResult);

        const testResult = this._createTestResult(formattedResult, _.extend(props, {
            timestamp: formattedResult.timestamp
        }));

        if (hasNoRefImageErrors(formattedResult)) {
            testResult.status = FAIL;
        }

        // To prevent skips duplication on reporter startup
        const isPreviouslySkippedTest = testResult.status === SKIPPED && getTestFromDb(this._sqliteAdapter, formattedResult);

        if (!ignoredStatuses.includes(testResult.status) && !isPreviouslySkippedTest) {
            this._writeTestResultToDb(testResult, formattedResult);
        }

        return formattedResult;
    }

    protected _createTestResult(result: ReporterTestResult, props: {status: TestStatus} & Partial<PreparedTestResult>): PreparedTestResult {
        const {
            browserId, file, sessionId, description, history,
            imagesInfo = [], screenshot, multipleTabs, errorDetails
        } = result;

        const {baseHost, saveErrorDetails} = this._pluginConfig;
        const suiteUrl: string = getAbsoluteUrl(result.url, baseHost);
        const metaInfoFull = _.merge(_.cloneDeep(result.meta), {url: getRelativeUrl(suiteUrl) ?? '', file, sessionId});
        const metaInfo = _.omitBy(metaInfoFull, _.isEmpty);

        const testResult: PreparedTestResult = Object.assign({
            suiteUrl, name: browserId, metaInfo, description, history,
            imagesInfo, screenshot: Boolean(screenshot), multipleTabs
        }, props);

        const error = getError(result.error);
        if (!_.isEmpty(error)) {
            testResult.error = error;
        }

        if (saveErrorDetails && errorDetails) {
            testResult.errorDetails = _.pick(errorDetails, ['title', 'filePath']);
        }

        return testResult;
    }

    protected _writeTestResultToDb(testResult: PreparedTestResult, formattedResult: ReporterTestResult): void {
        const suiteName = formattedResult.state.name;
        const suitePath = formattedResult.testPath;

        this._sqliteAdapter.write({testResult, suitePath, suiteName});
    }

    protected _deleteTestResultFromDb(...args: Parameters<typeof this._sqliteAdapter.delete>): void {
        this._sqliteAdapter.delete(...args);
    }

    async finalize(): Promise<void> {
        this._sqliteAdapter.close();

        const reportsSaver = this._htmlReporter.reportsSaver;

        if (reportsSaver) {
            const reportDir = this._pluginConfig.path;
            const src = path.join(reportDir, LOCAL_DATABASE_NAME);
            const dbPath = await reportsSaver.saveReportData(src, {destPath: LOCAL_DATABASE_NAME, reportDir: reportDir});
            await writeDatabaseUrlsFile(reportDir, [dbPath]);
            await fs.remove(src);
        }
    }
}
