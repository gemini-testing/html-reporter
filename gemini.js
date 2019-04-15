'use strict';

const Promise = require('bluebird');
const PluginAdapter = require('./lib/plugin-adapter');
const utils = require('./lib/server-utils');

module.exports = (gemini, opts) => {
    const plugin = PluginAdapter.create(gemini, opts, 'gemini');

    if (!plugin.isEnabled()) {
        return;
    }

    plugin
        .addApi()
        .addCliCommands()
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

        gemini.on(gemini.events.END, (stats) => resolve(
            reportBuilder
                .setStats(stats)
                .setApiValues(gemini.htmlReporter.values)
        ));
    });
}

function prepareImages(gemini, pluginConfig, reportBuilder) {
    const {path: reportPath} = pluginConfig;

    function handleErrorEvent(result) {
        const src = result.getCurrImg().path || result.getErrImg().path;

        return src && utils.copyImageAsync(src, utils.getCurrentAbsolutePath(result, reportPath));
    }

    return new Promise((resolve, reject) => {
        let queue = Promise.resolve();

        gemini.on(gemini.events.ERROR, (testResult) => {
            queue = queue.then(() => handleErrorEvent(reportBuilder.format(testResult)));
        });

        gemini.on(gemini.events.RETRY, (testResult) => {
            const formattedResult = reportBuilder.format(testResult);

            queue = queue.then(() => {
                return formattedResult.hasDiff()
                    ? formattedResult.saveTestImages(reportPath)
                    : handleErrorEvent(formattedResult);
            });
        });

        gemini.on(gemini.events.TEST_RESULT, (testResult) => {
            queue = queue.then(() => reportBuilder.format(testResult).saveTestImages(reportPath));
        });

        gemini.on(gemini.events.UPDATE_RESULT, (testResult) => {
            queue = queue.then(() => reportBuilder.format(testResult).saveTestImages(reportPath));
        });

        gemini.on(gemini.events.END, () => queue.then(resolve, reject));
    });
}
