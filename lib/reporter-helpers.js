'use strict';

const path = require('path');
const fs = require('fs-extra');
const utils = require('./server-utils');

exports.saveTestImages = (testResult, reportPath) => {
    const actions = [
        utils.copyImageAsync(
            testResult.referencePath,
            utils.getReferenceAbsolutePath(testResult, reportPath)
        )
    ];

    if (testResult.hasDiff()) {
        actions.push(
            exports.saveTestCurrentImage(testResult, reportPath),
            utils.saveDiff(
                testResult,
                utils.getDiffAbsolutePath(testResult, reportPath)
            )
        );
    }

    return Promise.all(actions);
};

exports.saveTestCurrentImage = (testResult, reportPath) => {
    const src = testResult.imagePath || testResult.currentPath || testResult.screenshot;

    return src
        ? utils.copyImageAsync(src, utils.getCurrentAbsolutePath(testResult, reportPath))
        : Promise.resolve();
};

exports.updateReferenceImage = (testResult, reportPath) => {
    const src = testResult.actualPath
        ? path.resolve(reportPath, testResult.actualPath)
        : utils.getCurrentAbsolutePath(testResult, reportPath);

    return Promise.all([
        utils.copyImageAsync(src, testResult.imagePath),
        utils.copyImageAsync(src, utils.getReferenceAbsolutePath(testResult, reportPath))
    ]);
};

exports.saveBase64Screenshot = (testResult, reportPath) => {
    if (!testResult.screenshot) {
        utils.logger.warn('Cannot save screenshot on reject');

        return Promise.resolve();
    }

    const destPath = utils.getCurrentAbsolutePath(testResult, reportPath);

    return utils.makeDirFor(destPath)
        .then(() => fs.writeFileAsync(destPath, new Buffer(testResult.screenshot, 'base64'), 'base64'));
};
