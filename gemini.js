'use strict';

const Promise = require('bluebird');
const PluginAdapter = require('./lib/plugin-adapter');
const utils = require('./lib/server-utils');
const {saveTestImages} = require('./lib/reporter-helpers');

module.exports = (gemini, opts) => {
    const plugin = PluginAdapter.create(gemini, opts, 'gemini');

    if (!plugin.isEnabled()) {
        return;
    }

    plugin
        .extendCliByGuiCommand()
        .init(prepareData, prepareImages);
};

function prepareData(gemini, reportBuilder) {
    return new Promise((resolve) => {
        gemini.on(gemini.events.SKIP_STATE, (result) => reportBuilder.addSkipped(result));

        gemini.on(gemini.events.TEST_RESULT, (result) => {
            return result.equal ? reportBuilder.addSuccess(result) : reportBuilder.addFail(result);
        });

        gemini.on(gemini.events.UPDATE_RESULT, (result) => reportBuilder.addSuccess(result));

        gemini.on(gemini.events.RETRY, (result) => reportBuilder.addRetry(result));

        gemini.on(gemini.events.ERROR, (result) => reportBuilder.addError(result));

        gemini.on(gemini.events.END, (stats) => resolve(reportBuilder.setStats(stats)));
    });
}

function prepareImages(gemini, pluginConfig, reportBuilder) {
    const {path: reportPath} = pluginConfig;
    function handleErrorEvent(result) {
        var src = result.imagePath || result.currentPath;

        return src && utils.copyImageAsync(src, utils.getCurrentAbsolutePath(result, reportPath));
    }

    return new Promise((resolve, reject) => {
        let queue = Promise.resolve();

        gemini.on(gemini.events.ERROR, (testResult) => {
            queue = queue.then(() => handleErrorEvent(reportBuilder.format(testResult)));
        });

        gemini.on(gemini.events.RETRY, (testResult) => {
            const wrapped = reportBuilder.format(testResult);

            queue = queue.then(() => {
                return wrapped.hasDiff()
                    ? saveTestImages(wrapped, reportPath)
                    : handleErrorEvent(wrapped);
            });
        });

        gemini.on(gemini.events.TEST_RESULT, (testResult) => {
            queue = queue.then(() => saveTestImages(reportBuilder.format(testResult), reportPath));
        });

        gemini.on(gemini.events.UPDATE_RESULT, (testResult) => {
            testResult = Object.assign(testResult, {
                referencePath: testResult.imagePath,
                equal: true
            });

            queue = queue.then(() => saveTestImages(reportBuilder.format(testResult), reportPath));
        });

        gemini.on(gemini.events.END, () => queue.then(resolve, reject));
    });
}
