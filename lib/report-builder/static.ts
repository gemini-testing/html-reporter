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
    PluginEvents, UNKNOWN_ATTEMPT, UPDATED
} from '../constants';
import type {PreparedTestResult, SqliteClient} from '../sqlite-client';
import {ReporterTestResult} from '../test-adapter';
import {hasImage, saveErrorDetails, saveStaticFilesToReportDir, writeDatabaseUrlsFile} from '../server-utils';
import {ReporterConfig} from '../types';
import {HtmlReporter} from '../plugin-api';
import {ImageHandler} from '../image-handler';
import {SqliteImageStore} from '../image-store';
import {getUrlWithBase, getError, getRelativeUrl, hasDiff, hasNoRefImageErrors} from '../common-utils';
import {getTestFromDb} from '../db-utils/server';
import {ImageDiffError} from '../errors';
import {TestAttemptManager} from '../test-attempt-manager';
import {copyAndUpdate} from '../test-adapter/utils';
import {RegisterWorkers} from '../workers/create-workers';

const ignoredStatuses = [RUNNING, IDLE];

interface StaticReportBuilderOptions {
    dbClient: SqliteClient;
}

export class StaticReportBuilder {
    protected _htmlReporter: HtmlReporter;
    protected _pluginConfig: ReporterConfig;
    protected _dbClient: SqliteClient;
    protected _imageHandler: ImageHandler;
    protected _testAttemptManager: TestAttemptManager;
    private _workers: RegisterWorkers<['saveDiffTo']> | null;

    static create<T extends StaticReportBuilder>(
        this: new (htmlReporter: HtmlReporter, pluginConfig: ReporterConfig, options: StaticReportBuilderOptions) => T,
        htmlReporter: HtmlReporter,
        pluginConfig: ReporterConfig,
        options: StaticReportBuilderOptions
    ): T {
        return new this(htmlReporter, pluginConfig, options);
    }

    constructor(htmlReporter: HtmlReporter, pluginConfig: ReporterConfig, {dbClient}: StaticReportBuilderOptions) {
        this._htmlReporter = htmlReporter;
        this._pluginConfig = pluginConfig;

        this._dbClient = dbClient;

        this._testAttemptManager = new TestAttemptManager();

        const imageStore = new SqliteImageStore(this._dbClient);
        this._imageHandler = new ImageHandler(imageStore, htmlReporter.imagesSaver, {reportPath: pluginConfig.path});

        this._workers = null;

        this._htmlReporter.on(PluginEvents.IMAGES_SAVER_UPDATED, (newImagesSaver) => {
            this._imageHandler.setImagesSaver(newImagesSaver);
        });

        this._htmlReporter.listenTo(this._imageHandler as unknown as GeneralEventEmitter, [PluginEvents.TEST_SCREENSHOTS_SAVED]);
    }

    get imageHandler(): ImageHandler {
        return this._imageHandler;
    }

    async saveStaticFiles(): Promise<void> {
        const destPath = this._pluginConfig.path;

        await Promise.all([
            saveStaticFilesToReportDir(this._htmlReporter, this._pluginConfig, destPath),
            writeDatabaseUrlsFile(destPath, [LOCAL_DATABASE_NAME])
        ]);
    }

    async addSkipped(result: ReporterTestResult): Promise<ReporterTestResult> {
        return this._addTestResult(result, {
            status: SKIPPED,
            skipReason: result.skipReason
        });
    }

    async addSuccess(result: ReporterTestResult): Promise<ReporterTestResult> {
        return this._addTestResult(result, {status: SUCCESS});
    }

    async addFail(result: ReporterTestResult): Promise<ReporterTestResult> {
        return this._addFailResult(result);
    }

    async addError(result: ReporterTestResult): Promise<ReporterTestResult> {
        return this._addErrorResult(result);
    }

    async addRetry(result: ReporterTestResult): Promise<ReporterTestResult> {
        if (hasDiff(result.assertViewResults as ImageDiffError[])) {
            return this._addFailResult(result);
        } else {
            return this._addErrorResult(result);
        }
    }

    registerWorkers(workers: RegisterWorkers<['saveDiffTo']>): void {
        this._workers = workers;
    }

    private _ensureWorkers(): RegisterWorkers<['saveDiffTo']> {
        if (!this._workers) {
            throw new Error('You must register workers before using report builder.' +
                'Make sure registerWorkers() was called before adding any test results.');
        }

        return this._workers;
    }

    /** If passed test result doesn't have attempt, this method registers new attempt and sets attempt number */
    private _provideAttempt(testResultOriginal: ReporterTestResult): ReporterTestResult {
        let formattedResult = testResultOriginal;

        if (testResultOriginal.attempt === UNKNOWN_ATTEMPT) {
            const imagesInfoFormatter = this._imageHandler;
            const attempt = this._testAttemptManager.registerAttempt(testResultOriginal, testResultOriginal.status);
            formattedResult = copyAndUpdate(testResultOriginal, {attempt}, {imagesInfoFormatter});
        }

        return formattedResult;
    }

    private async _saveTestResultData(testResult: ReporterTestResult): Promise<void> {
        if ([IDLE, RUNNING, UPDATED].includes(testResult.status)) {
            return;
        }

        const actions: Promise<unknown>[] = [];

        if (!_.isEmpty(testResult.assertViewResults)) {
            actions.push(this._imageHandler.saveTestImages(testResult, this._ensureWorkers()));
        }

        if (this._pluginConfig.saveErrorDetails && testResult.errorDetails) {
            actions.push(saveErrorDetails(testResult, this._pluginConfig.path));
        }

        await Promise.all(actions);
    }

    protected async _addFailResult(formattedResult: ReporterTestResult): Promise<ReporterTestResult> {
        return this._addTestResult(formattedResult, {status: FAIL});
    }

    protected async _addErrorResult(formattedResult: ReporterTestResult): Promise<ReporterTestResult> {
        return this._addTestResult(formattedResult, {status: ERROR});
    }

    protected async _addTestResult(formattedResultOriginal: ReporterTestResult, props: {status: TestStatus} & Partial<PreparedTestResult>): Promise<ReporterTestResult> {
        const formattedResult = this._provideAttempt(formattedResultOriginal);

        // Test result data has to be saved before writing to db, because user may save data to custom location
        await this._saveTestResultData(formattedResult);

        formattedResult.image = hasImage(formattedResult);

        const testResult = this._createTestResult(formattedResult, _.extend(props, {
            timestamp: formattedResult.timestamp ?? 0
        }));

        if (hasNoRefImageErrors(formattedResult as {assertViewResults: ImageDiffError[]})) {
            testResult.status = FAIL;
        }

        // To prevent skips duplication on reporter startup
        const isPreviouslySkippedTest = testResult.status === SKIPPED && getTestFromDb(this._dbClient, formattedResult);

        if (!ignoredStatuses.includes(testResult.status) && !isPreviouslySkippedTest) {
            this._dbClient.write(formattedResult);
        }

        return formattedResult;
    }

    protected _createTestResult(result: ReporterTestResult, props: {attempt?: number | null, status: TestStatus, timestamp: number;} & Partial<PreparedTestResult>): PreparedTestResult {
        const {
            browserId, file, sessionId, description, history,
            imagesInfo = [], screenshot, multipleTabs, errorDetails, testPath
        } = result;

        const {baseHost, saveErrorDetails} = this._pluginConfig;
        const suiteUrl: string = getUrlWithBase(result.url, baseHost);
        const metaInfoFull = _.merge(_.cloneDeep(result.meta), {url: getRelativeUrl(suiteUrl) ?? '', file, sessionId});
        const metaInfo = _.omitBy(metaInfoFull, _.isEmpty);

        const testResult: PreparedTestResult = Object.assign({
            suiteUrl, name: browserId, metaInfo, description, history,
            imagesInfo, screenshot: Boolean(screenshot), multipleTabs,
            suitePath: testPath, suiteName: _.last(testPath) as string
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

    protected _deleteTestResultFromDb(...args: Parameters<typeof this._dbClient.delete>): void {
        this._dbClient.delete(...args);
    }

    async finalize(): Promise<void> {
        this._dbClient.close();

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
