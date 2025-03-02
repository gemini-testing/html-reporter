import path from 'path';
import {GeneralEventEmitter} from 'eventemitter2';
import fs from 'fs-extra';
import PQueue from 'p-queue';

import {
    IDLE,
    RUNNING,
    SKIPPED,
    LOCAL_DATABASE_NAME,
    PluginEvents, UNKNOWN_ATTEMPT, UPDATED, TestStatus
} from '../constants';
import type {SqliteClient} from '../sqlite-client';
import {ReporterTestResult} from '../adapters/test-result';
import {saveErrorDetails, saveStaticFilesToReportDir, writeDatabaseUrlsFile} from '../server-utils';
import {ReporterConfig} from '../types';
import {HtmlReporter} from '../plugin-api';
import {getTestFromDb} from '../db-utils/server';
import {TestAttemptManager} from '../test-attempt-manager';
import {copyAndUpdate} from '../adapters/test-result/utils';
import {RegisterWorkers} from '../workers/create-workers';
import {ImagesInfoSaver} from '../images-info-saver';

const ignoredStatuses = [RUNNING, IDLE];

export interface StaticReportBuilderOptions {
    htmlReporter: HtmlReporter,
    reporterConfig: ReporterConfig,
    dbClient: SqliteClient;
    imagesInfoSaver: ImagesInfoSaver;
}

export class StaticReportBuilder {
    protected _htmlReporter: HtmlReporter;
    protected _reporterConfig: ReporterConfig;
    protected _dbClient: SqliteClient;
    protected _imagesInfoSaver: ImagesInfoSaver;
    protected _testAttemptManager: TestAttemptManager;
    private _workers?: RegisterWorkers<['saveDiffTo']>;

    static create<T extends StaticReportBuilder>(
        this: new (options: StaticReportBuilderOptions) => T,
        options: StaticReportBuilderOptions
    ): T {
        return new this(options);
    }

    constructor({htmlReporter, reporterConfig, dbClient, imagesInfoSaver}: StaticReportBuilderOptions) {
        this._htmlReporter = htmlReporter;
        this._reporterConfig = reporterConfig;

        this._dbClient = dbClient;

        this._testAttemptManager = new TestAttemptManager();

        this._imagesInfoSaver = imagesInfoSaver;

        this._htmlReporter.on(PluginEvents.IMAGES_SAVER_UPDATED, (newImagesSaver) => {
            this._imagesInfoSaver.setImageFileSaver(newImagesSaver);
        });

        this._htmlReporter.listenTo(this._imagesInfoSaver as unknown as GeneralEventEmitter, [PluginEvents.TEST_SCREENSHOTS_SAVED]);
    }

    async saveStaticFiles(): Promise<void> {
        const destPath = this._reporterConfig.path;

        await Promise.all([
            saveStaticFilesToReportDir(this._htmlReporter, this._reporterConfig, destPath),
            writeDatabaseUrlsFile(destPath, [LOCAL_DATABASE_NAME])
        ]);
    }

    registerWorkers(workers: RegisterWorkers<['saveDiffTo']>): void {
        this._workers = workers;
    }

    registerAttempt(testInfo: {fullName: string, browserId: string}, status: TestStatus): number {
        return this._testAttemptManager.registerAttempt(testInfo, status);
    }

    getLatestAttempt(testInfo: {fullName: string, browserId: string}): number {
        return this._testAttemptManager.getCurrentAttempt(testInfo);
    }

    /** If passed test result doesn't have attempt, this method registers new attempt and sets attempt number */
    provideAttempt(testResultOriginal: ReporterTestResult): ReporterTestResult {
        let formattedResult = testResultOriginal;

        if (testResultOriginal.attempt === UNKNOWN_ATTEMPT) {
            const attempt = this._testAttemptManager.registerAttempt(testResultOriginal, testResultOriginal.status);
            formattedResult = copyAndUpdate(testResultOriginal, {attempt});
        }

        return formattedResult;
    }

    private async _saveTestResultData(testResult: ReporterTestResult): Promise<ReporterTestResult> {
        if ([IDLE, RUNNING, UPDATED].includes(testResult.status)) {
            return testResult;
        }

        const actions = new PQueue();
        let testResultWithImagePaths: ReporterTestResult = testResult;

        actions.add(async () => {
            testResultWithImagePaths = await this._imagesInfoSaver.save(testResult, this._workers);
        });

        if (this._reporterConfig.saveErrorDetails && testResult.errorDetails) {
            actions.add(async () => saveErrorDetails(testResult, this._reporterConfig.path));
        }

        await actions.onIdle();

        return testResultWithImagePaths;
    }

    async addTestResult(formattedResultOriginal: ReporterTestResult): Promise<ReporterTestResult> {
        const formattedResult = this.provideAttempt(formattedResultOriginal);

        // Test result data has to be saved before writing to db, because user may save data to custom location
        const testResultWithImagePaths = await this._saveTestResultData(formattedResult);

        // To prevent skips duplication on reporter startup
        const isPreviouslySkippedTest = testResultWithImagePaths.status === SKIPPED && getTestFromDb(this._dbClient, formattedResult);

        if (!ignoredStatuses.includes(testResultWithImagePaths.status) && !isPreviouslySkippedTest) {
            this._dbClient.write(testResultWithImagePaths);
        }

        return testResultWithImagePaths;
    }

    protected _deleteTestResultFromDb(...args: Parameters<typeof this._dbClient.delete>): void {
        this._dbClient.delete(...args);
    }

    async finalize(): Promise<void> {
        this._dbClient.close();

        const reportsSaver = this._htmlReporter.reportsSaver;

        if (reportsSaver) {
            const reportDir = this._reporterConfig.path;
            const src = path.join(reportDir, LOCAL_DATABASE_NAME);
            const dbPath = await reportsSaver.saveReportData(src, {destPath: LOCAL_DATABASE_NAME, reportDir: reportDir});
            await writeDatabaseUrlsFile(reportDir, [dbPath]);
            await fs.remove(src);
        }
    }
}
