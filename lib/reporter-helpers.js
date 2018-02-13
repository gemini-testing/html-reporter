'use strict';

const utils = require('../utils');

exports.saveTestImages = function(testResult, pluginConfig) {
    const actions = [
        utils.copyImageAsync(
            testResult.referencePath,
            utils.getReferenceAbsolutePath(testResult, pluginConfig.path)
        )
    ];

    if (!testResult.equal) {
        actions.push(
            utils.copyImageAsync(
                testResult.currentPath,
                utils.getCurrentAbsolutePath(testResult, pluginConfig.path)
            ),
            utils.saveDiff(
                testResult,
                utils.getDiffAbsolutePath(testResult, pluginConfig.path)
            )
        );
    }

    return Promise.all(actions);
};
