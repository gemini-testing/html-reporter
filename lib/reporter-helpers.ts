import path from 'path';
import tmp from 'tmp';
import _ from 'lodash';
import {getShortMD5, isImageInfoWithState} from './common-utils';
import * as utils from './server-utils';
import {ReporterTestResult} from './test-adapter';
import {getImagesInfoByStateName} from './server-utils';
import {copyAndUpdate} from './test-adapter/utils';
import {ImageInfoFull, ImageInfoUpdated} from './types';
import {UPDATED} from './constants';

const mkReferenceHash = (testId: string, stateName: string): string => getShortMD5(`${testId}#${stateName}`);

type OnReferenceUpdateCb = (testResult: ReporterTestResult, images: ImageInfoUpdated, state: string) => void;

export const updateReferenceImages = async (testResult: ReporterTestResult, reportPath: string, onReferenceUpdateCb: OnReferenceUpdateCb): Promise<ReporterTestResult> => {
    const newImagesInfo: ImageInfoFull[] = await Promise.all(testResult.imagesInfo.map(async (imageInfo) => {
        const newImageInfo = _.clone(imageInfo);

        if (!isImageInfoWithState(newImageInfo) || newImageInfo.status !== UPDATED) {
            return newImageInfo;
        }

        const {stateName} = newImageInfo;

        const {actualImg} = newImageInfo;
        const src = actualImg?.path
            ? path.resolve(reportPath, actualImg.path)
            : utils.getCurrentAbsolutePath(testResult, reportPath, stateName);

        const referencePath = newImageInfo.refImg.path;

        if (utils.fileExists(referencePath)) {
            const referenceId = mkReferenceHash(testResult.id, stateName);
            const oldReferencePath = path.resolve(tmp.tmpdir, referenceId);
            await utils.copyFileAsync(referencePath, oldReferencePath);
        }

        const reportReferencePath = utils.getReferencePath(testResult, stateName);

        await Promise.all([
            utils.copyFileAsync(src, referencePath),
            utils.copyFileAsync(src, path.resolve(reportPath, reportReferencePath))
        ]);

        const {expectedImg} = newImageInfo;
        expectedImg.path = reportReferencePath;

        onReferenceUpdateCb(testResult, newImageInfo, stateName);

        return newImageInfo;
    }));

    return copyAndUpdate(testResult, {imagesInfo: newImagesInfo});
};

export const revertReferenceImage = async (removedResult: ReporterTestResult, newResult: ReporterTestResult, stateName: string): Promise<void> => {
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
