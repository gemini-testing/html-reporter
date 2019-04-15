'use strict';

const path = require('path');
const fs = require('fs-extra');
const Promise = require('bluebird');
const utils = require('./server-utils');

exports.saveTestCurrentImage = (testResult, reportPath, stateName) => {
    const src = testResult.getCurrImg(stateName).path || testResult.getErrImg().path;

    return src
        ? utils.copyImageAsync(src, utils.getCurrentAbsolutePath(testResult, reportPath, stateName))
        : Promise.resolve();
};

exports.updateReferenceImage = (testResult, reportPath, stateName) => {
    const currImg = testResult.getCurrImg(stateName);

    const src = currImg.path
        ? path.resolve(reportPath, currImg.path)
        : utils.getCurrentAbsolutePath(testResult, reportPath, stateName);

    return Promise.all([
        utils.copyImageAsync(src, testResult.getRefImg(stateName).path),
        utils.copyImageAsync(src, utils.getReferenceAbsolutePath(testResult, reportPath, stateName))
    ]);
};

exports.saveBase64Screenshot = (testResult, reportPath) => {
    if (!testResult.screenshot.base64) {
        utils.logger.warn('Cannot save screenshot on reject');

        return Promise.resolve();
    }

    const destPath = utils.getCurrentAbsolutePath(testResult, reportPath);

    return utils.makeDirFor(destPath)
        .then(() => fs.writeFile(destPath, new Buffer(testResult.screenshot.base64, 'base64'), 'base64'));
};
