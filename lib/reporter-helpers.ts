import path from 'path';
import fs from 'fs-extra';
import {pipeline} from 'stream/promises';
import _ from 'lodash';
import {fetchFile, getShortMD5, isImageInfoWithState, isUrl} from './common-utils';
import * as utils from './server-utils';
import {ReporterTestResult} from './adapters/test-result';
import {getImagesInfoByStateName} from './server-utils';
import {copyAndUpdate} from './adapters/test-result/utils';
import {ImageInfoFull, ImageInfoUpdated} from './types';
import {UPDATED} from './constants';

const mkReferenceHash = (testId: string, stateName: string): string => getShortMD5(`${testId}#${stateName}`);

export type OnReferenceUpdateCb = (testResult: ReporterTestResult, images: ImageInfoUpdated, state: string) => void;

const resolveSourcePath = (actualImgPath: string, reportPath: string): string => {
    return isUrl(actualImgPath) ? actualImgPath : path.resolve(reportPath, actualImgPath);
};

const copyImageFromUrl = async (imageUrl: string, destinationPath: string): Promise<void> => {
    const {data, status} = await fetchFile<NodeJS.ReadableStream>(imageUrl, {responseType: 'stream'});

    if (!data) {
        throw new Error(`Failed to fetch image by URL "${imageUrl}". Request status: ${status}`);
    }

    await utils.makeDirFor(destinationPath);
    await pipeline(data, fs.createWriteStream(destinationPath));
};

export const updateReferenceImages = async (testResult: ReporterTestResult, reportPath: string, onReferenceUpdateCb: OnReferenceUpdateCb): Promise<ReporterTestResult> => {
    const {default: tmp} = await import('tmp');

    const newImagesInfo: ImageInfoFull[] = await Promise.all(testResult.imagesInfo.map(async (imageInfo) => {
        const newImageInfo = _.clone(imageInfo);

        if (!isImageInfoWithState(newImageInfo) || newImageInfo.status !== UPDATED) {
            return newImageInfo;
        }

        const {stateName} = newImageInfo;

        const {actualImg} = newImageInfo;
        const src = actualImg?.path
            ? resolveSourcePath(actualImg.path, reportPath)
            : utils.getCurrentAbsolutePath(testResult, reportPath, stateName);

        const referencePath = newImageInfo.refImg.path;

        if (utils.fileExists(referencePath)) {
            const referenceId = mkReferenceHash(testResult.id, stateName);
            const oldReferencePath = path.resolve(tmp.tmpdir, referenceId);
            await utils.copyFileAsync(referencePath, oldReferencePath);
        }

        const reportReferencePath = utils.getReferencePath(testResult, stateName);
        const resolvedReportReferencePath = path.resolve(reportPath, reportReferencePath);

        if (isUrl(src)) {
            await copyImageFromUrl(src, referencePath);
            await utils.copyFileAsync(referencePath, resolvedReportReferencePath);
        } else {
            await Promise.all([
                utils.copyFileAsync(src, referencePath),
                utils.copyFileAsync(src, resolvedReportReferencePath)
            ]);
        }

        const {expectedImg} = newImageInfo;
        expectedImg.path = reportReferencePath;

        onReferenceUpdateCb(testResult, newImageInfo, stateName);

        return newImageInfo;
    }));

    return copyAndUpdate(testResult, {imagesInfo: newImagesInfo});
};

export const revertReferenceImage = async (removedResult: ReporterTestResult, newResult: ReporterTestResult, stateName: string): Promise<void> => {
    const {default: tmp} = await import('tmp');

    const referenceId = removedResult.id;
    const referenceHash = mkReferenceHash(referenceId, stateName);
    const oldReferencePath = path.resolve(tmp.tmpdir, referenceHash);
    const referencePath = getImagesInfoByStateName(newResult.imagesInfo, stateName)?.refImg?.path;

    if (!referencePath) {
        return;
    }

    return utils.copyFileAsync(oldReferencePath, referencePath);
};

export const removeReferenceImage = async (testResult: ReporterTestResult, stateName: string): Promise<void> => {
    const imagePath = getImagesInfoByStateName(testResult.imagesInfo, stateName)?.refImg?.path;

    if (!imagePath) {
        return;
    }

    return utils.deleteFile(imagePath);
};
