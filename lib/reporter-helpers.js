'use strict';

const path = require('path');
const tmp = require('tmp');
const Promise = require('bluebird');
const {getShortMD5} = require('./common-utils');
const utils = require('./server-utils');
const {ImageHandler} = require('./image-handler');

const mkReferenceId = (testId, stateName) => getShortMD5(`${testId}#${stateName}`);

exports.updateReferenceImage = async (testResult, reportPath, stateName) => {
    const currImg = ImageHandler.getCurrImg(testResult.assertViewResults, stateName) ?? {};

    const src = currImg.path
        ? path.resolve(reportPath, currImg.path)
        : utils.getCurrentAbsolutePath(testResult, reportPath, stateName);

    const referencePath = ImageHandler.getRefImg(testResult.assertViewResults, stateName)?.path;

    if (utils.fileExists(referencePath)) {
        const referenceId = mkReferenceId(testResult.id, stateName);
        const oldReferencePath = path.resolve(tmp.tmpdir, referenceId);
        await utils.copyFileAsync(referencePath, oldReferencePath);
    }

    return Promise.all([
        utils.copyFileAsync(src, referencePath),
        utils.copyFileAsync(src, utils.getReferenceAbsolutePath(testResult, reportPath, stateName))
    ]);
};

exports.revertReferenceImage = (testResult, stateName) => {
    const referenceId = mkReferenceId(testResult.id, stateName);
    const oldReferencePath = path.resolve(tmp.tmpdir, referenceId);
    const referencePath = ImageHandler.getRefImg(testResult.assertViewResults, stateName)?.path;

    return utils.copyFileAsync(oldReferencePath, referencePath);
};

exports.removeReferenceImage = (testResult, stateName) => {
    return utils.deleteFile(ImageHandler.getRefImg(testResult.assertViewResults, stateName)?.path);
};
