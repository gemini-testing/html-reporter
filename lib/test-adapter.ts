import _ from 'lodash';
import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp';
import crypto from 'crypto';
import type {default as Hermione} from 'hermione';

import SuiteAdapter from './suite-adapter';
import {DB_COLUMNS} from './constants/database';
import {getSuitePath} from './plugin-utils';
import {getCommandsHistory} from './history-utils';
import {ERROR, ERROR_DETAILS_PATH, FAIL, SUCCESS, TestStatus, UPDATED} from './constants';
import {getShortMD5, logger} from './common-utils';
import * as utils from './server-utils';
import {
    ErrorDetails,
    ImageInfoFail,
    HtmlReporterApi,
    ImageInfo,
    ImagesSaver,
    LabeledSuitesRow,
    TestResult,
    ImageData,
    ImageInfoFull, ImageDiffError, AssertViewResult, ImageInfoError,
    ImageBase64
} from './types';
import type {SqliteAdapter} from './sqlite-adapter';
import EventEmitter2 from 'eventemitter2';
import type {HtmlReporter} from './plugin-api';
import type * as Workers from './workers/worker';

interface PrepareTestResultData {
    name: string;
    suitePath: string[];
    browserId: string;
}

const globalCacheAllImages: Map<string, string> = new Map();
const globalCacheExpectedPaths: Map<string, string> = new Map();
const globalCacheDiffImages: Map<string, string> = new Map();
const testsAttempts: Map<string, number> = new Map();

function createHash(buffer: Buffer): string {
    return crypto
        .createHash('sha1')
        .update(buffer)
        .digest('base64');
}

export interface TestAdapterOptions {
    hermione: Hermione & HtmlReporterApi;
    sqliteAdapter: SqliteAdapter;
    status: TestStatus;
}

export class TestAdapter {
    private _testResult: TestResult;
    private _hermione: Hermione & HtmlReporterApi;
    private _sqliteAdapter: SqliteAdapter;
    private _errors: Hermione['errors'];
    private _suite: SuiteAdapter;
    private _imagesSaver: ImagesSaver;
    private _testId: string;
    private _errorDetails: ErrorDetails | null;
    private _timestamp: number;
    private _attempt: number;

    static create<T extends TestAdapter>(this: new (testResult: TestResult, options: TestAdapterOptions) => T, testResult: TestResult, {hermione, sqliteAdapter, status}: TestAdapterOptions): T {
        return new this(testResult, {hermione, sqliteAdapter, status});
    }

    constructor(testResult: TestResult, {hermione, sqliteAdapter, status}: TestAdapterOptions) {
        this._testResult = testResult;
        this._hermione = hermione;
        this._sqliteAdapter = sqliteAdapter;
        this._errors = this._hermione.errors;
        this._suite = SuiteAdapter.create(this._testResult);
        this._imagesSaver = this._hermione.htmlReporter.imagesSaver;
        this._testId = this._mkTestId();
        this._errorDetails = null;
        this._timestamp = this._testResult.timestamp;

        const browserVersion = _.get(this._testResult, 'meta.browserVersion', this._testResult.browserVersion);

        _.set(this._testResult, 'meta.browserVersion', browserVersion);

        if (utils.shouldUpdateAttempt(status)) {
            testsAttempts.set(this._testId, _.isUndefined(testsAttempts.get(this._testId)) ? 0 : testsAttempts.get(this._testId) as number + 1);
        }

        this._attempt = testsAttempts.get(this._testId) || 0;
    }

    get suite(): SuiteAdapter {
        return this._suite;
    }

    get sessionId(): string {
        return this._testResult.sessionId || 'unknown session id';
    }

    get browserId(): string {
        return this._testResult.browserId;
    }

    get imagesInfo(): ImageInfoFull[] | undefined {
        return this._testResult.imagesInfo;
    }

    set imagesInfo(imagesInfo: ImageInfoFull[]) {
        this._testResult.imagesInfo = imagesInfo;
    }

    protected _getImgFromStorage(imgPath: string): string {
        // fallback for updating image in gui mode
        return globalCacheAllImages.get(imgPath) || imgPath;
    }

    protected _getLastImageInfoFromDb(stateName?: string): ImageInfo | undefined {
        const browserName = this._testResult.browserId;
        const suitePath = getSuitePath(this._testResult);
        const suitePathString = JSON.stringify(suitePath);

        const imagesInfoResult = this._sqliteAdapter.query<Pick<LabeledSuitesRow, 'imagesInfo'> | undefined>({
            select: DB_COLUMNS.IMAGES_INFO,
            where: `${DB_COLUMNS.SUITE_PATH} = ? AND ${DB_COLUMNS.NAME} = ?`,
            orderBy: DB_COLUMNS.TIMESTAMP,
            orderDescending: true
        }, suitePathString, browserName);

        const imagesInfo: ImageInfoFull[] = imagesInfoResult && JSON.parse(imagesInfoResult[DB_COLUMNS.IMAGES_INFO as keyof Pick<LabeledSuitesRow, 'imagesInfo'>]) || [];
        return imagesInfo.find(info => info.stateName === stateName);
    }

    protected _getExpectedPath(stateName: string | undefined, status: TestStatus | undefined, cacheExpectedPaths: Map<string, string>): {path: string, reused: boolean} {
        const key = this._getExpectedKey(stateName);

        if (status === UPDATED) {
            const expectedPath = utils.getReferencePath(this, stateName);
            cacheExpectedPaths.set(key, expectedPath);

            return {path: expectedPath, reused: false};
        }

        if (cacheExpectedPaths.has(key)) {
            return {path: cacheExpectedPaths.get(key) as string, reused: true};
        }

        const imageInfo = this._getLastImageInfoFromDb(stateName);

        if (imageInfo && (imageInfo as ImageInfoFail).expectedImg) {
            const expectedPath = (imageInfo as ImageInfoFail).expectedImg.path;

            cacheExpectedPaths.set(key, expectedPath);

            return {path: expectedPath, reused: true};
        }

        const expectedPath = utils.getReferencePath(this, stateName);

        cacheExpectedPaths.set(key, expectedPath);

        return {path: expectedPath, reused: false};
    }

    getImagesFor(status: TestStatus, stateName?: string): ImageInfo | undefined {
        const refImg = this.getRefImg(stateName);
        const currImg = this.getCurrImg(stateName);
        const errImg = this.getErrImg();

        const {path: refPath} = this._getExpectedPath(stateName, status, globalCacheExpectedPaths);
        const currPath = utils.getCurrentPath(this, stateName);
        const diffPath = utils.getDiffPath(this, stateName);

        if ((status === SUCCESS || status === UPDATED) && refImg) {
            return {expectedImg: {path: this._getImgFromStorage(refPath), size: refImg.size}};
        }

        if (status === FAIL && refImg && currImg) {
            return {
                expectedImg: {
                    path: this._getImgFromStorage(refPath),
                    size: refImg.size
                },
                actualImg: {
                    path: this._getImgFromStorage(currPath),
                    size: currImg.size
                },
                diffImg: {
                    path: this._getImgFromStorage(diffPath),
                    size: {
                        width: _.max([_.get(refImg, 'size.width'), _.get(currImg, 'size.width')]) as number,
                        height: _.max([_.get(refImg, 'size.height'), _.get(currImg, 'size.height')]) as number
                    }
                }
            };
        }

        if (status === ERROR && currImg && errImg) {
            return {
                actualImg: {
                    path: this.state ? this._getImgFromStorage(currPath) : '',
                    size: currImg.size || errImg.size
                }
            };
        }

        return;
    }

    protected async _saveErrorScreenshot(reportPath: string): Promise<void> {
        if (!this.screenshot?.base64) {
            logger.warn('Cannot save screenshot on reject');

            return Promise.resolve();
        }

        const currPath = utils.getCurrentPath(this);
        const localPath = path.resolve(tmp.tmpdir, currPath);
        await utils.makeDirFor(localPath);
        await fs.writeFile(localPath, new Buffer(this.screenshot.base64, 'base64'), 'base64');

        await this._saveImg(localPath, currPath, reportPath);
    }

    protected async _saveImg(localPath: string | undefined, destPath: string, reportDir: string): Promise<string | undefined> {
        if (!localPath) {
            return Promise.resolve(undefined);
        }

        const res = await this._imagesSaver.saveImg(localPath, {destPath, reportDir});

        globalCacheAllImages.set(destPath, res || destPath);
        return res;
    }

    get origAttempt(): number | undefined {
        return this._testResult.origAttempt;
    }

    get attempt(): number {
        return this._attempt;
    }

    set attempt(attemptNum: number) {
        testsAttempts.set(this._testId, attemptNum);
        this._attempt = attemptNum;
    }

    hasDiff(): boolean {
        return this.assertViewResults.some((result) => this.isImageDiffError(result));
    }

    get assertViewResults(): AssertViewResult[] {
        return this._testResult.assertViewResults || [];
    }

    isImageDiffError(assertResult: AssertViewResult): boolean {
        return assertResult instanceof this._errors.ImageDiffError;
    }

    isNoRefImageError(assertResult: AssertViewResult): boolean {
        return assertResult instanceof this._errors.NoRefImageError;
    }

    getImagesInfo(): ImageInfoFull[] {
        if (!_.isEmpty(this.imagesInfo)) {
            return this.imagesInfo as ImageInfoFull[];
        }

        this.imagesInfo = this.assertViewResults.map((assertResult): ImageInfoFull => {
            let status, error;

            if (!(assertResult instanceof Error)) {
                status = SUCCESS;
            }

            if (this.isImageDiffError(assertResult)) {
                status = FAIL;
            }

            if (this.isNoRefImageError(assertResult)) {
                status = ERROR;
                error = _.pick(assertResult, ['message', 'stack']);
            }

            const {stateName, refImg, diffClusters} = assertResult;

            return _.extend(
                {stateName, refImg, status: status, error, diffClusters},
                this.getImagesFor(status as TestStatus, stateName)
            ) as ImageInfoFull;
        });

        // common screenshot on test fail
        if (this.screenshot) {
            const errorImage = _.extend(
                {status: ERROR, error: this.error},
                this.getImagesFor(ERROR)
            ) as ImageInfoError;

            (this.imagesInfo as ImageInfoFull[]).push(errorImage);
        }

        return this.imagesInfo;
    }

    get history(): string[] {
        return getCommandsHistory(this._testResult.history) as string[];
    }

    get error(): undefined | {message?: string; stack?: string; stateName?: string} {
        // TODO: return undefined or null if there's no err
        return _.pick(this._testResult.err, ['message', 'stack', 'stateName']);
    }

    get imageDir(): string {
        // TODO: remove toString after publish major version
        return this._testResult.id.toString();
    }

    get state(): {name: string} {
        return {name: this._testResult.title};
    }

    get testPath(): string[] {
        return this._suite.path.concat(this._testResult.title);
    }

    get id(): string {
        return this.testPath.concat(this.browserId, this.attempt.toString()).join(' ');
    }

    get screenshot(): ImageBase64 | undefined {
        return _.get(this._testResult, 'err.screenshot');
    }

    get description(): string | undefined {
        return this._testResult.description;
    }

    get meta(): Record<string, unknown> {
        return this._testResult.meta;
    }

    get errorDetails(): ErrorDetails | null {
        if (!_.isNil(this._errorDetails)) {
            return this._errorDetails;
        }

        const details = _.get(this._testResult, 'err.details', null);

        if (details) {
            this._errorDetails = {
                title: details.title || 'error details',
                data: details.data,
                filePath: `${ERROR_DETAILS_PATH}/${utils.getDetailsFileName(
                    this._testResult.id, this._testResult.browserId, this.attempt
                )}`
            };
        } else {
            this._errorDetails = null;
        }

        return this._errorDetails;
    }

    getRefImg(stateName?: string): ImageData | Record<string, never> {
        return _.get(_.find(this.assertViewResults, {stateName}), 'refImg', {});
    }

    getCurrImg(stateName?: string): ImageData | Record<string, never> {
        return _.get(_.find(this.assertViewResults, {stateName}), 'currImg', {});
    }

    getErrImg(): ImageBase64 | Record<string, never> {
        return this.screenshot || {};
    }

    prepareTestResult(): PrepareTestResultData {
        const {title: name, browserId} = this._testResult;
        const suitePath = getSuitePath(this._testResult);

        return {name, suitePath, browserId};
    }

    get multipleTabs(): boolean {
        return true;
    }

    get timestamp(): number {
        return this._timestamp;
    }

    set timestamp(timestamp) {
        if (!_.isNumber(this._timestamp)) {
            this._timestamp = timestamp;
        }
    }

    async saveErrorDetails(reportPath: string): Promise<void> {
        if (!this.errorDetails) {
            return;
        }

        const detailsFilePath = path.resolve(reportPath, this.errorDetails.filePath);
        const detailsData = _.isObject(this.errorDetails.data)
            ? JSON.stringify(this.errorDetails.data, null, 2)
            : this.errorDetails.data;

        await utils.makeDirFor(detailsFilePath);
        await fs.writeFile(detailsFilePath, detailsData);
    }

    async saveTestImages(reportPath: string, workers: typeof Workers, cacheExpectedPaths = globalCacheExpectedPaths): Promise<unknown[]> {
        const result = await Promise.all(this.assertViewResults.map(async (assertResult) => {
            const {stateName} = assertResult;
            const {path: destRefPath, reused: reusedReference} = this._getExpectedPath(stateName, undefined, cacheExpectedPaths);
            const srcRefPath = this.getRefImg(stateName)?.path;

            const destCurrPath = utils.getCurrentPath(this, stateName);
            // TODO: getErrImg returns base64, but here we mistakenly try to get its path
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const srcCurrPath = this.getCurrImg(stateName)?.path || (this.getErrImg() as any)?.path;

            const dstCurrPath = utils.getDiffPath(this, stateName);
            const srcDiffPath = path.resolve(tmp.tmpdir, dstCurrPath);
            const actions: unknown[] = [];

            if (!(assertResult instanceof Error)) {
                actions.push(this._saveImg(srcRefPath, destRefPath, reportPath));
            }

            if (this.isImageDiffError(assertResult)) {
                await this._saveDiffInWorker(assertResult, srcDiffPath, workers);

                actions.push(
                    this._saveImg(srcCurrPath, destCurrPath, reportPath),
                    this._saveImg(srcDiffPath, dstCurrPath, reportPath)
                );

                if (!reusedReference) {
                    actions.push(this._saveImg(srcRefPath, destRefPath, reportPath));
                }
            }

            if (this.isNoRefImageError(assertResult)) {
                actions.push(this._saveImg(srcCurrPath, destCurrPath, reportPath));
            }

            return Promise.all(actions);
        }));

        if (this.screenshot) {
            await this._saveErrorScreenshot(reportPath);
        }

        const htmlReporter = this._hermione.htmlReporter as HtmlReporter & EventEmitter2;
        await htmlReporter.emitAsync(htmlReporter.events.TEST_SCREENSHOTS_SAVED, {
            testId: this._testId,
            attempt: this.attempt,
            imagesInfo: this.getImagesInfo()
        });

        return result;
    }

    updateCacheExpectedPath(stateName: string, expectedPath: string): void {
        const key = this._getExpectedKey(stateName);

        if (expectedPath) {
            globalCacheExpectedPaths.set(key, expectedPath);
        } else {
            globalCacheExpectedPaths.delete(key);
        }
    }

    decreaseAttemptNumber(): void {
        const testId = this._mkTestId();
        const currentTestAttempt = testsAttempts.get(testId) as number;
        const previousTestAttempt = currentTestAttempt - 1;

        if (previousTestAttempt) {
            testsAttempts.set(testId, previousTestAttempt);
        } else {
            testsAttempts.delete(testId);
        }
    }

    protected _mkTestId(): string {
        return this._testResult.fullTitle() + '.' + this._testResult.browserId;
    }

    protected _getExpectedKey(stateName?: string): string {
        const shortTestId = getShortMD5(this._mkTestId());

        return shortTestId + '#' + stateName;
    }

    //parallelize and cache of 'looks-same.createDiff' (because it is very slow)
    protected async _saveDiffInWorker(imageDiffError: ImageDiffError, destPath: string, workers: typeof Workers, cacheDiffImages = globalCacheDiffImages): Promise<void> {
        await utils.makeDirFor(destPath);

        if (imageDiffError.diffBuffer) { // new versions of hermione provide `diffBuffer`
            const pngBuffer = Buffer.from(imageDiffError.diffBuffer);

            await fs.writeFile(destPath, pngBuffer);

            return;
        }

        const currPath = imageDiffError.currImg.path;
        const refPath = imageDiffError.refImg.path;

        const [currBuffer, refBuffer] = await Promise.all([
            fs.readFile(currPath),
            fs.readFile(refPath)
        ]);

        const hash = createHash(currBuffer) + createHash(refBuffer);

        if (cacheDiffImages.has(hash)) {
            const cachedDiffPath = cacheDiffImages.get(hash) as string;

            await fs.copy(cachedDiffPath, destPath);
            return;
        }

        await workers.saveDiffTo(imageDiffError, destPath);

        cacheDiffImages.set(hash, destPath);
    }
}
