import path from 'path';
import EventEmitter2 from 'eventemitter2';
import fs from 'fs-extra';
import _ from 'lodash';
import tmp from 'tmp';

import type {ImageStore} from './image-store';
import {RegisterWorkers} from './workers/create-workers';
import * as utils from './server-utils';
import {
    AssertViewResult,
    ImageBase64,
    ImageData,
    ImageInfo, ImageInfoError,
    ImageInfoFail,
    ImageInfoFull,
    ImagesSaver,
    ImageInfoPageSuccess
} from './types';
import {ERROR, FAIL, PluginEvents, SUCCESS, TestStatus, UPDATED} from './constants';
import {
    getError,
    getShortMD5,
    isBase64Image,
    isImageDiffError,
    isNoRefImageError,
    logger,
    mkTestId
} from './common-utils';
import {ImageDiffError} from './errors';
import {cacheExpectedPaths, cacheAllImages, cacheDiffImages} from './image-cache';
import {ReporterTestResult} from './test-adapter';

// A type to prevent accidental infinite recursion on a type level
export type ReporterTestResultPlain = Omit<ReporterTestResult, 'imagesInfo'>;

export interface ImagesInfoFormatter {
    getImagesInfo(testResult: ReporterTestResultPlain): ImageInfoFull[];
}

export interface ImageHandlerOptions {
    reportPath: string;
}

interface TestSpec {
    fullName: string;
    browserId: string;
}

export class ImageHandler extends EventEmitter2 implements ImagesInfoFormatter {
    private _imageStore: ImageStore;
    private _imagesSaver: ImagesSaver;
    private _options: ImageHandlerOptions;

    constructor(imageStore: ImageStore, imagesSaver: ImagesSaver, options: ImageHandlerOptions) {
        super();
        this._imageStore = imageStore;
        this._imagesSaver = imagesSaver;
        this._options = options;
    }

    static getCurrImg(assertViewResults: AssertViewResult[], stateName?: string): ImageData | undefined {
        return _.get(_.find(assertViewResults, {stateName}), 'currImg');
    }

    static getDiffImg(assertViewResults: AssertViewResult[], stateName?: string): ImageData | undefined {
        return _.get(_.find(assertViewResults, {stateName}), 'diffImg');
    }

    static getRefImg(assertViewResults: AssertViewResult[], stateName?: string): ImageData | undefined {
        return _.get(_.find(assertViewResults, {stateName}), 'refImg');
    }

    static getScreenshot(testResult: ReporterTestResultPlain): ImageBase64 | ImageData | null | undefined {
        return testResult.screenshot;
    }

    getImagesFor(testResult: ReporterTestResultPlain, assertViewStatus: TestStatus, stateName?: string): ImageInfo | undefined {
        const refImg = ImageHandler.getRefImg(testResult.assertViewResults, stateName);
        const currImg = ImageHandler.getCurrImg(testResult.assertViewResults, stateName);

        const pageImg = ImageHandler.getScreenshot(testResult);

        const {path: refPath} = this._getExpectedPath(testResult, stateName);
        const currPath = utils.getCurrentPath({attempt: testResult.attempt, browserId: testResult.browserId, imageDir: testResult.imageDir, stateName});
        const diffPath = utils.getDiffPath({attempt: testResult.attempt, browserId: testResult.browserId, imageDir: testResult.imageDir, stateName});

        // Handling whole page common screenshots
        if (!stateName && pageImg) {
            return {
                actualImg: {
                    path: this._getImgFromStorage(currPath),
                    size: pageImg.size
                }
            };
        }

        if ((assertViewStatus === SUCCESS || assertViewStatus === UPDATED) && refImg) {
            const result: ImageInfo = {
                expectedImg: {path: this._getImgFromStorage(refPath), size: refImg.size}
            };
            if (currImg) {
                result.actualImg = {path: this._getImgFromStorage(currPath), size: currImg.size};
            }

            return result;
        }

        if (assertViewStatus === FAIL && refImg && currImg) {
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

        if (assertViewStatus === ERROR && currImg) {
            return {
                actualImg: {
                    path: this._getImgFromStorage(currPath),
                    size: currImg.size
                }
            };
        }

        return;
    }

    getImagesInfo(testResult: ReporterTestResultPlain): ImageInfoFull[] {
        const imagesInfo: ImageInfoFull[] = testResult.assertViewResults?.map((assertResult): ImageInfoFull => {
            let status: TestStatus, error: {message: string; stack?: string;} | undefined;

            if (testResult.isUpdated === true) {
                status = UPDATED;
            } else if (isImageDiffError(assertResult)) {
                status = FAIL;
            } else if (isNoRefImageError(assertResult)) {
                status = ERROR;
                error = _.pick(assertResult, ['message', 'name', 'stack']);
            } else {
                status = SUCCESS;
            }

            const {stateName, refImg} = assertResult;
            const diffClusters = (assertResult as ImageDiffError).diffClusters;

            return _.extend(
                {stateName, refImg, status: status, error, diffClusters},
                this.getImagesFor(testResult, status, stateName)
            ) as ImageInfoFull;
        }) ?? [];

        // Common page screenshot
        if (ImageHandler.getScreenshot(testResult)) {
            const error = getError(testResult.error);

            if (!_.isEmpty(error)) {
                imagesInfo.push(_.extend(
                    {status: ERROR, error},
                    this.getImagesFor(testResult, ERROR)
                ) as ImageInfoError);
            } else {
                imagesInfo.push(_.extend(
                    {status: SUCCESS},
                    this.getImagesFor(testResult, SUCCESS)
                ) as ImageInfoPageSuccess);
            }
        }

        return imagesInfo;
    }

    async saveTestImages(testResult: ReporterTestResultPlain, worker: RegisterWorkers<['saveDiffTo']>): Promise<unknown[]> {
        const {assertViewResults = []} = testResult;

        const result = await Promise.all(assertViewResults.map(async (assertResult) => {
            const {stateName} = assertResult;
            const {path: destRefPath, reused: reusedReference} = this._getExpectedPath(testResult, stateName);
            const srcRefPath = ImageHandler.getRefImg(testResult.assertViewResults, stateName)?.path;

            const destCurrPath = utils.getCurrentPath({attempt: testResult.attempt, browserId: testResult.browserId, imageDir: testResult.imageDir, stateName});
            const srcCurrPath = ImageHandler.getCurrImg(testResult.assertViewResults, stateName)?.path;

            const destDiffPath = utils.getDiffPath({attempt: testResult.attempt, browserId: testResult.browserId, imageDir: testResult.imageDir, stateName});
            const srcDiffPath = ImageHandler.getDiffImg(assertViewResults, stateName)?.path ?? path.resolve(tmp.tmpdir, destDiffPath);
            const actions: unknown[] = [];

            if (!(assertResult instanceof Error)) {
                actions.push(this._saveImg(srcRefPath, destRefPath));
            }

            if (isImageDiffError(assertResult)) {
                if (!assertResult.diffImg) {
                    await this._saveDiffInWorker(assertResult, srcDiffPath, worker);
                }

                actions.push(
                    this._saveImg(srcCurrPath, destCurrPath),
                    this._saveImg(srcDiffPath, destDiffPath)
                );

                if (!reusedReference) {
                    actions.push(this._saveImg(srcRefPath, destRefPath));
                }
            }

            if (isNoRefImageError(assertResult)) {
                actions.push(this._saveImg(srcCurrPath, destCurrPath));
            }

            return Promise.all(actions);
        }));

        if (ImageHandler.getScreenshot(testResult)) {
            await this._savePageScreenshot(testResult);
        }

        await this.emitAsync(PluginEvents.TEST_SCREENSHOTS_SAVED, {
            testId: mkTestId(testResult.fullName, testResult.browserId),
            attempt: testResult.attempt,
            imagesInfo: this.getImagesInfo(testResult)
        });

        return result;
    }

    setImagesSaver(newImagesSaver: ImagesSaver): void {
        this._imagesSaver = newImagesSaver;
    }

    updateCacheExpectedPath(testResult: TestSpec, stateName: string, expectedPath: string): void {
        const key = this._getExpectedKey(testResult, stateName);

        if (expectedPath) {
            cacheExpectedPaths.set(key, expectedPath);
        } else {
            cacheExpectedPaths.delete(key);
        }
    }

    private _getExpectedKey(testResult: TestSpec, stateName?: string): string {
        const shortTestId = getShortMD5(mkTestId(testResult.fullName, testResult.browserId));

        return shortTestId + '#' + stateName;
    }

    private _getExpectedPath(testResult: ReporterTestResultPlain, stateName?: string): {path: string, reused: boolean} {
        const key = this._getExpectedKey(testResult, stateName);

        if (testResult.status === UPDATED) {
            const expectedPath = utils.getReferencePath({attempt: testResult.attempt, browserId: testResult.browserId, imageDir: testResult.imageDir, stateName});
            cacheExpectedPaths.set(key, expectedPath);

            return {path: expectedPath, reused: false};
        }

        if (cacheExpectedPaths.has(key)) {
            return {path: cacheExpectedPaths.get(key) as string, reused: true};
        }

        const imageInfo = this._imageStore.getLastImageInfoFromDb(testResult, stateName);

        if (imageInfo && (imageInfo as ImageInfoFail).expectedImg) {
            const expectedPath = (imageInfo as ImageInfoFail).expectedImg.path;

            cacheExpectedPaths.set(key, expectedPath);

            return {path: expectedPath, reused: true};
        }

        const expectedPath = utils.getReferencePath({attempt: testResult.attempt, browserId: testResult.browserId, imageDir: testResult.imageDir, stateName});

        cacheExpectedPaths.set(key, expectedPath);

        return {path: expectedPath, reused: false};
    }

    private _getImgFromStorage(imgPath: string): string {
        // fallback for updating image in gui mode
        return cacheAllImages.get(imgPath) || imgPath;
    }

    private async _saveDiffInWorker(imageDiffError: ImageDiffError, destPath: string, worker: RegisterWorkers<['saveDiffTo']>): Promise<void> {
        await utils.makeDirFor(destPath);

        // new versions of hermione provide `diffBuffer`
        if (imageDiffError.diffBuffer) {
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

        const hash = utils.createHash(currBuffer) + utils.createHash(refBuffer);

        if (cacheDiffImages.has(hash)) {
            const cachedDiffPath = cacheDiffImages.get(hash) as string;

            await fs.copy(cachedDiffPath, destPath);
            return;
        }

        await worker.saveDiffTo(imageDiffError, destPath);

        cacheDiffImages.set(hash, destPath);
    }

    private async _savePageScreenshot(testResult: ReporterTestResultPlain): Promise<void> {
        const screenshot = ImageHandler.getScreenshot(testResult);
        if (!(screenshot as ImageBase64)?.base64 && !(screenshot as ImageData)?.path) {
            logger.warn('Cannot save screenshot on reject');

            return Promise.resolve();
        }

        const currPath = utils.getCurrentPath({attempt: testResult.attempt, browserId: testResult.browserId, imageDir: testResult.imageDir});
        let localPath: string;

        if (isBase64Image(screenshot)) {
            localPath = path.resolve(tmp.tmpdir, currPath);
            await utils.makeDirFor(localPath);
            await fs.writeFile(localPath, new Buffer(screenshot.base64, 'base64'), 'base64');
        } else {
            localPath = screenshot?.path as string;
        }

        await this._saveImg(localPath, currPath);
    }

    private async _saveImg(localPath: string | undefined, destPath: string): Promise<string | undefined> {
        if (!localPath) {
            return Promise.resolve(undefined);
        }

        const res = await this._imagesSaver.saveImg(localPath, {destPath, reportDir: this._options.reportPath});

        cacheAllImages.set(destPath, res || destPath);
        return res;
    }
}
