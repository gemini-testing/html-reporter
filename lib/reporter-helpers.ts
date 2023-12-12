import * as path from 'path';
import * as tmp from 'tmp';
import {getShortMD5} from './common-utils';
import * as utils from './server-utils';
import {ImageHandler} from './image-handler';
import {ReporterTestResult} from './test-adapter';

const mkReferenceHash = (testId: string, stateName: string): string => getShortMD5(`${testId}#${stateName}`);

export const updateReferenceImage = async (testResult: ReporterTestResult, reportPath: string, stateName: string): Promise<void[]> => {
    const currImg = ImageHandler.getCurrImg(testResult.assertViewResults, stateName);

    const src = currImg?.path
        ? path.resolve(reportPath, currImg.path)
        : utils.getCurrentAbsolutePath(testResult, reportPath, stateName);

    // TODO: get rid of type assertion
    const referencePath = ImageHandler.getRefImg(testResult.assertViewResults, stateName)?.path as string;

    if (utils.fileExists(referencePath)) {
        const referenceId = mkReferenceHash(testResult.id, stateName);
        const oldReferencePath = path.resolve(tmp.tmpdir, referenceId);
        await utils.copyFileAsync(referencePath, oldReferencePath);
    }

    return Promise.all([
        utils.copyFileAsync(src, referencePath),
        utils.copyFileAsync(src, utils.getReferenceAbsolutePath(testResult, reportPath, stateName))
    ]);
};

export const revertReferenceImage = async (removedResult: ReporterTestResult, newResult: ReporterTestResult, stateName: string): Promise<void> => {
    const referenceId = removedResult.id;
    const referenceHash = mkReferenceHash(referenceId, stateName);
    const oldReferencePath = path.resolve(tmp.tmpdir, referenceHash);
    const referencePath = ImageHandler.getRefImg(newResult.assertViewResults, stateName)?.path;

    if (!referencePath) {
        return;
    }

    return utils.copyFileAsync(oldReferencePath, referencePath);
};

export const removeReferenceImage = async (testResult: ReporterTestResult, stateName: string): Promise<void> => {
    const imagePath = ImageHandler.getRefImg(testResult.assertViewResults, stateName)?.path;

    if (!imagePath) {
        return;
    }

    return utils.deleteFile(imagePath);
};
