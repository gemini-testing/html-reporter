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
    TestResult
} from './types';
import {ERROR, FAIL, PluginEvents, SUCCESS, TestStatus, UPDATED} from './constants';
import {getError, getShortMD5, isImageDiffError, isNoRefImageError, logger, mkTestId} from './common-utils';
import {ImageDiffError} from './errors';
import {cacheExpectedPaths, cacheAllImages, cacheDiffImages} from './image-cache';

export interface ImagesInfoFormatter {
    getImagesInfo(testResult: TestResult, attempt: number): ImageInfoFull[];
    getCurrImg(assertViewResults: AssertViewResult[], stateName?: string): ImageData | undefined;
    getRefImg(assertViewResults: AssertViewResult[], stateName?: string): ImageData | undefined;
    getScreenshot(testResult: TestResult): ImageBase64 | undefined;
}

export interface ImageHandlerOptions {
    reportPath: string;
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

    getCurrImg(assertViewResults: AssertViewResult[], stateName?: string): ImageData | undefined {
        return _.get(_.find(assertViewResults, {stateName}), 'currImg');
    }

    getImagesFor(testResult: TestResult, attempt: number, status: TestStatus, stateName?: string): ImageInfo | undefined {
        const refImg = this.getRefImg(testResult.assertViewResults, stateName);
        const currImg = this.getCurrImg(testResult.assertViewResults, stateName);
        const errImg = this.getScreenshot(testResult);

        const {path: refPath} = this._getExpectedPath(testResult, attempt, stateName, status);
        const currPath = utils.getCurrentPath({attempt, browserId: testResult.browserId, imageDir: testResult.id.toString(), stateName});
        const diffPath = utils.getDiffPath({attempt, browserId: testResult.browserId, imageDir: testResult.id.toString(), stateName});

        if ((status === SUCCESS || status === UPDATED) && refImg) {
            const result: ImageInfo = {
                expectedImg: {path: this._getImgFromStorage(refPath), size: refImg.size}
            };
            if (currImg) {
                result.actualImg = {path: this._getImgFromStorage(currPath), size: currImg.size};
            }

            return result;
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

        if (status === ERROR && errImg) {
            return {
                actualImg: {
                    path: testResult.title ? this._getImgFromStorage(currPath) : '',
                    size: currImg?.size || errImg.size
                }
            };
        }

        return;
    }

    getImagesInfo(testResult: TestResult, attempt: number): ImageInfoFull[] {
        const imagesInfo: ImageInfoFull[] = testResult.assertViewResults?.map((assertResult): ImageInfoFull => {
            let status: TestStatus | undefined, error: {message: string; stack: string;} | undefined;

            if (testResult.updated === true) {
                status = UPDATED;
            } else if (!(assertResult instanceof Error)) {
                status = SUCCESS;
            } else if (isImageDiffError(assertResult)) {
                status = FAIL;
            } else if (isNoRefImageError(assertResult)) {
                status = ERROR;
                error = _.pick(assertResult, ['message', 'stack']);
            }

            const {stateName, refImg} = assertResult;
            const diffClusters = (assertResult as ImageDiffError).diffClusters;

            return _.extend(
                {stateName, refImg, status: status, error, diffClusters},
                this.getImagesFor(testResult, attempt, status as TestStatus, stateName)
            ) as ImageInfoFull;
        }) ?? [];

        // common screenshot on test fail
        if (this.getScreenshot(testResult)) {
            const errorImage = _.extend(
                {status: ERROR, error: getError(testResult)},
                this.getImagesFor(testResult, attempt, ERROR)
            ) as ImageInfoError;

            imagesInfo.push(errorImage);
        }

        return imagesInfo;
    }

    getRefImg(assertViewResults: AssertViewResult[], stateName?: string): ImageData | undefined {
        return _.get(_.find(assertViewResults, {stateName}), 'refImg');
    }

    getScreenshot(testResult: TestResult): ImageBase64 | undefined {
        return _.get(testResult, 'err.screenshot');
    }

    async saveTestImages(testResult: TestResult, attempt: number, worker: RegisterWorkers<['saveDiffTo']>): Promise<unknown[]> {
        const {assertViewResults = []} = testResult;

        const result = await Promise.all(assertViewResults.map(async (assertResult) => {
            const {stateName} = assertResult;
            const {path: destRefPath, reused: reusedReference} = this._getExpectedPath(testResult, attempt, stateName, undefined);
            const srcRefPath = this.getRefImg(testResult.assertViewResults, stateName)?.path;

            const destCurrPath = utils.getCurrentPath({attempt, browserId: testResult.browserId, imageDir: testResult.id.toString(), stateName});
            const srcCurrPath = this.getCurrImg(testResult.assertViewResults, stateName)?.path;

            const dstCurrPath = utils.getDiffPath({attempt, browserId: testResult.browserId, imageDir: testResult.id.toString(), stateName});
            const srcDiffPath = path.resolve(tmp.tmpdir, dstCurrPath);
            const actions: unknown[] = [];

            if (!(assertResult instanceof Error)) {
                actions.push(this._saveImg(srcRefPath, destRefPath));
            }

            if (isImageDiffError(assertResult)) {
                await this._saveDiffInWorker(assertResult, srcDiffPath, worker);

                actions.push(
                    this._saveImg(srcCurrPath, destCurrPath),
                    this._saveImg(srcDiffPath, dstCurrPath)
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

        if (this.getScreenshot(testResult)) {
            await this._saveErrorScreenshot(testResult, attempt);
        }

        await this.emitAsync(PluginEvents.TEST_SCREENSHOTS_SAVED, {
            testId: mkTestId(testResult.fullTitle(), testResult.browserId),
            attempt: attempt,
            imagesInfo: this.getImagesInfo(testResult, attempt)
        });

        return result;
    }

    setImagesSaver(newImagesSaver: ImagesSaver): void {
        this._imagesSaver = newImagesSaver;
    }

    updateCacheExpectedPath(testResult: TestResult, stateName: string, expectedPath: string): void {
        const key = this._getExpectedKey(testResult, stateName);

        if (expectedPath) {
            cacheExpectedPaths.set(key, expectedPath);
        } else {
            cacheExpectedPaths.delete(key);
        }
    }

    private _getExpectedKey(testResult: TestResult, stateName?: string): string {
        const shortTestId = getShortMD5(mkTestId(testResult.fullTitle(), testResult.browserId));

        return shortTestId + '#' + stateName;
    }

    private _getExpectedPath(testResult: TestResult, attempt: number, stateName?: string, status?: TestStatus): {path: string, reused: boolean} {
        const key = this._getExpectedKey(testResult, stateName);

        if (status === UPDATED) {
            const expectedPath = utils.getReferencePath({attempt, browserId: testResult.browserId, imageDir: testResult.id.toString(), stateName});
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

        const expectedPath = utils.getReferencePath({attempt, browserId: testResult.browserId, imageDir: testResult.id.toString(), stateName});

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

    private async _saveErrorScreenshot(testResult: TestResult, attempt: number): Promise<void> {
        const screenshot = this.getScreenshot(testResult);
        if (!screenshot?.base64) {
            logger.warn('Cannot save screenshot on reject');

            return Promise.resolve();
        }

        const currPath = utils.getCurrentPath({attempt, browserId: testResult.browserId, imageDir: testResult.id.toString()});
        const localPath = path.resolve(tmp.tmpdir, currPath);
        await utils.makeDirFor(localPath);
        await fs.writeFile(localPath, new Buffer(screenshot.base64, 'base64'), 'base64');

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
