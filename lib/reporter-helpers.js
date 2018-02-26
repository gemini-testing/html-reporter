'use strict';

const utils = require('./server-utils');

exports.saveTestImages = (testResult, reportPath) => {
    const actions = [
        utils.copyImageAsync(
            testResult.referencePath,
            utils.getReferenceAbsolutePath(testResult, reportPath)
        )
    ];

    if (!testResult.equal) {
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
    const src = testResult.imagePath || testResult.currentPath;

    return src
        ? utils.copyImageAsync(src, utils.getCurrentAbsolutePath(testResult, reportPath))
        : Promise.resolve();
};

exports.updateReferenceImage = (testResult, reportPath) => {
    const src = utils.getCurrentAbsolutePath(testResult, reportPath);

    return Promise.all([
        utils.copyImageAsync(src, testResult.imagePath),
        utils.copyImageAsync(src, utils.getReferenceAbsolutePath(testResult, reportPath))
    ]);
};
