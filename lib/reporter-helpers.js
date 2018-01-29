'use strict';

const utils = require('../utils');

exports.saveTestImages = function(testResult, reportPath) {
    const actions = [
        utils.copyImageAsync(
            testResult.referencePath,
            utils.getReferenceAbsolutePath(testResult, reportPath)
        )
    ];

    if (!testResult.equal) {
        actions.push(
            utils.copyImageAsync(
                testResult.currentPath,
                utils.getCurrentAbsolutePath(testResult, reportPath)
            ),
            utils.saveDiff(
                testResult,
                utils.getDiffAbsolutePath(testResult, reportPath)
            )
        );
    }

    return Promise.all(actions);
};
