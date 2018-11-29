'use strict';

const path = require('path');
const fs = require('fs-extra');
const Promise = require('bluebird');
const utils = require('./server-utils');

function saveAssertViewImages(testResult, reportPath) {
    return Promise.map(testResult.assertViewResults, (assertResult) => {
        const {stateName} = assertResult;
        const actions = [];

        if (!(assertResult instanceof Error)) {
            actions.push(utils.copyImageAsync(
                testResult.getRefImg(stateName).path,
                utils.getReferenceAbsolutePath(testResult, reportPath, stateName)
            ));
        }

        if (testResult.isImageDiffError(assertResult)) {
            actions.push(
                exports.saveTestCurrentImage(testResult, reportPath, stateName),
                utils.saveDiff(
                    assertResult,
                    utils.getDiffAbsolutePath(testResult, reportPath, stateName)
                ),
                utils.copyImageAsync(
                    testResult.getRefImg(stateName).path,
                    utils.getReferenceAbsolutePath(testResult, reportPath, stateName)
                )
            );
        }

        if (testResult.isNoRefImageError(assertResult)) {
            actions.push(exports.saveTestCurrentImage(testResult, reportPath, stateName));
        }

        return Promise.all(actions);
    });
}

exports.saveTestImages = (testResult, reportPath) => {
    if (testResult.assertViewResults) {
        return saveAssertViewImages(testResult, reportPath);
    }

    const actions = [
        utils.copyImageAsync(
            testResult.getRefImg().path,
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
    if (!testResult.screenshot) {
        utils.logger.warn('Cannot save screenshot on reject');

        return Promise.resolve();
    }

    const destPath = utils.getCurrentAbsolutePath(testResult, reportPath);

    return utils.makeDirFor(destPath)
        .then(() => fs.writeFileAsync(destPath, new Buffer(testResult.screenshot.base64, 'base64'), 'base64'));
};
