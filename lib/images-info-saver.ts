import util from 'util';
import makeDebug from 'debug';
import EventEmitter2 from 'eventemitter2';
import fs from 'fs-extra';
import sizeOf from 'image-size';
import _ from 'lodash';
import PQueue from 'p-queue';

import {RegisterWorkers} from './workers/create-workers';
import {ReporterTestResult} from './adapters/test-result';
import {
    DiffOptions, ImageBase64, ImageBuffer,
    ImageFile,
    ImageFileSaver,
    ImageInfoDiff,
    ImageInfoFull,
    ImageSize, TestSpecByPath
} from './types';
import {copyAndUpdate, removeBufferFromImagesInfo} from './adapters/test-result/utils';
import {cacheDiffImages} from './image-cache';
import {NEW_ISSUE_LINK, PluginEvents, TestStatus, UPDATED} from './constants';
import {createHash, getCurrentPath, getDiffPath, getReferencePath, getTempPath, makeDirFor} from './server-utils';
import {isBase64Image, mkTestId, isImageBufferData} from './common-utils';
import {ImageStore} from './image-store';
import {Cache} from './cache';

const debug = makeDebug('html-reporter:images-info-saver');

interface ImagesInfoSaverOptions {
    imageFileSaver: ImageFileSaver;
    reportPath: string;
    imageStore: ImageStore;
    expectedPathsCache: Cache<[TestSpecByPath, string | undefined], string>;
}

export class ImagesInfoSaver extends EventEmitter2 {
    private _imageFileSaver: ImageFileSaver;
    private _reportPath: string;
    private _imageStore: ImageStore;
    private _expectedPathsCache: Cache<[TestSpecByPath, string | undefined], string>;

    constructor(options: ImagesInfoSaverOptions) {
        super();

        this._imageFileSaver = options.imageFileSaver;
        this._reportPath = options.reportPath;
        this._imageStore = options.imageStore;
        this._expectedPathsCache = options.expectedPathsCache;
    }

    async save(testResult: ReporterTestResult, workers?: RegisterWorkers<['saveDiffTo']>): Promise<ReporterTestResult> {
        const testDebug = debug.extend(testResult.imageDir);
        testDebug(`Saving images of ${testResult.id}`);

        const newImagesInfos = await Promise.all(testResult.imagesInfo.map(async (imagesInfo, index) => {
            const imageDebug = testDebug.extend(index.toString());
            imageDebug.enabled && imageDebug('Handling %j', removeBufferFromImagesInfo(imagesInfo));

            const newImagesInfo = _.clone(imagesInfo);
            const {stateName} = imagesInfo as ImageInfoDiff;
            const actions = new PQueue();

            actions.add(async () => {
                (newImagesInfo as {actualImg?: ImageFile}).actualImg
                    = await this._saveActualImageIfNeeded(testResult, imagesInfo, stateName, {logger: imageDebug});
            });

            actions.add(async () => {
                (newImagesInfo as {diffImg?: ImageFile}).diffImg =
                    await this._saveDiffImageIfNeeded(testResult, imagesInfo, stateName, {workers, logger: imageDebug});
            });

            actions.add(async () => {
                (newImagesInfo as {expectedImg?: ImageFile}).expectedImg =
                    await this._saveExpectedImageIfNeeded(testResult, imagesInfo, stateName, {logger: imageDebug});
            });

            await actions.onIdle();

            return _.omitBy(newImagesInfo, _.isNil) as ImageInfoFull;
        }));

        await this.emitAsync(PluginEvents.TEST_SCREENSHOTS_SAVED, {
            testId: mkTestId(testResult.fullName, testResult.browserId),
            attempt: testResult.attempt,
            imagesInfo: newImagesInfos
        });

        return copyAndUpdate(testResult, {imagesInfo: newImagesInfos});
    }

    setImageFileSaver(imageFileSaver: ImageFileSaver): void {
        this._imageFileSaver = imageFileSaver;
    }

    private async _createDiffInFile(imagesInfo: ImageInfoDiff, filePath: string, workers: RegisterWorkers<['saveDiffTo']>): Promise<ImageFile> {
        await makeDirFor(filePath);

        const actualPath = imagesInfo.actualImg.path;
        const expectedPath = imagesInfo.expectedImg.path;

        const [currBuffer, refBuffer] = await Promise.all([
            fs.readFile(actualPath),
            fs.readFile(expectedPath)
        ]);

        const hash = createHash(currBuffer) + createHash(refBuffer);

        if (cacheDiffImages.has(hash)) {
            const cachedDiffPath = cacheDiffImages.get(hash) as string;

            await fs.copy(cachedDiffPath, filePath);
        } else {
            await workers.saveDiffTo({
                ...imagesInfo.diffOptions,
                reference: expectedPath,
                current: actualPath
            } satisfies DiffOptions, filePath);

            cacheDiffImages.set(hash, filePath);
        }

        return {path: filePath, size: _.pick(sizeOf(filePath), ['height', 'width']) as ImageSize};
    }

    private _getReusedExpectedPath(testResult: TestSpecByPath, imagesInfo: ImageInfoFull): string | null {
        if (imagesInfo.status === UPDATED) {
            return null;
        }

        const {stateName} = imagesInfo as ImageInfoDiff;

        if (this._expectedPathsCache.has([testResult, stateName])) {
            return this._expectedPathsCache.get([testResult, stateName]) as string;
        }

        const lastImageInfo = this._imageStore.getLastImageInfoFromDb(testResult, stateName) as ImageInfoDiff;

        if (lastImageInfo && lastImageInfo.expectedImg) {
            this._expectedPathsCache.set([testResult, stateName], (lastImageInfo.expectedImg as ImageFile).path);
            return (lastImageInfo.expectedImg as ImageFile).path;
        }

        return null;
    }

    private async _saveImage(imageData: ImageFile | ImageBuffer | ImageBase64, destPath: string): Promise<string> {
        const sourceFilePath = isImageBufferData(imageData) || isBase64Image(imageData) ? getTempPath(destPath) : imageData.path;
        if (isImageBufferData(imageData)) {
            await makeDirFor(sourceFilePath);
            await fs.writeFile(sourceFilePath, Buffer.from(imageData.buffer));
        } else if (isBase64Image(imageData)) {
            await makeDirFor(sourceFilePath);
            await fs.writeFile(sourceFilePath, Buffer.from(imageData.base64, 'base64'), 'base64');
        }

        const savedFilePath = await this._imageFileSaver.saveImg(sourceFilePath, {
            destPath,
            reportDir: this._reportPath
        });

        return savedFilePath || destPath;
    }

    private async _saveActualImageIfNeeded(testResult: ReporterTestResult, imagesInfo: ImageInfoFull, stateName: string | undefined, {logger}: {logger: debug.Debugger}): Promise<ImageFile | undefined> {
        const actualImg = imagesInfo.actualImg;
        if (!actualImg) {
            return actualImg;
        }

        const reportActualPath = getCurrentPath(testResult, stateName);

        const newActualPath = await this._saveImage(actualImg, reportActualPath);
        logger(`Saved actual image from ${(actualImg as ImageFile).path ?? '<buffer>'} to ${newActualPath}`);

        return {path: newActualPath, size: actualImg.size};
    }

    private async _saveDiffImageIfNeeded(
        testResult: ReporterTestResult,
        imagesInfo: ImageInfoFull,
        stateName: string | undefined,
        {workers, logger}: {workers?: RegisterWorkers<['saveDiffTo']>, logger: debug.Debugger}
    ): Promise<ImageFile | undefined> {
        const shouldSaveDiff = imagesInfo.status === TestStatus.FAIL &&
            (imagesInfo.diffImg || (imagesInfo.actualImg && imagesInfo.expectedImg));
        if (!shouldSaveDiff) {
            return;
        }
        let {diffImg} = imagesInfo;
        const reportDiffPath = getDiffPath(testResult, stateName);

        if (!diffImg) {
            if (!workers) {
                throw new Error('Couldn\'t generate diff image, because workers were not passed.\n' +
                    util.format('Test result: %o\n', testResult) +
                    `Please report this error to html-reporter team: ${NEW_ISSUE_LINK}.`);
            }
            diffImg = await this._createDiffInFile(imagesInfo, getTempPath(reportDiffPath), workers);
            logger(`Created new diff in file ${reportDiffPath}`);
        }

        const newDiffPath = await this._saveImage(diffImg, reportDiffPath);
        logger(`Saved diff image from ${(diffImg as ImageFile).path ?? '<buffer>'} to ${newDiffPath}`);

        const size = _.pick(sizeOf(isImageBufferData(diffImg) ? Buffer.from(diffImg.buffer) : diffImg.path), ['height', 'width']) as ImageSize;

        return {path: newDiffPath, size};
    }

    private async _saveExpectedImageIfNeeded(testResult: ReporterTestResult, imagesInfo: ImageInfoFull, stateName: string | undefined, {logger}: {logger: debug.Debugger}): Promise<ImageFile | undefined> {
        if (!(imagesInfo as ImageInfoDiff).expectedImg) {
            return;
        }
        const {expectedImg} = imagesInfo as ImageInfoDiff;
        const reusedExpectedPath = this._getReusedExpectedPath(testResult, imagesInfo);
        const reportDiffPath = reusedExpectedPath ?? getReferencePath(testResult, stateName);

        let newExpectedPath = reportDiffPath;

        if (!reusedExpectedPath) {
            newExpectedPath = await this._saveImage(expectedImg, reportDiffPath);
            logger(`Saved expected image from ${(expectedImg as ImageFile).path ?? '<buffer>'} to ${newExpectedPath}`);
        } else {
            logger(`Reused expected image from ${reusedExpectedPath}`);
        }

        return {path: newExpectedPath, size: expectedImg.size};
    }
}
