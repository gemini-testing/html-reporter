'use strict';

const Promise = require('bluebird');
const PluginAdapter = require('./lib/plugin-adapter');
const utils = require('./lib/server-utils');
const {saveTestImages, saveBase64Screenshot} = require('./lib/reporter-helpers');

module.exports = (hermione, opts) => {
    const plugin = PluginAdapter.create(hermione, opts, 'hermione');

    if (!plugin.isEnabled()) {
        return;
    }

    plugin
        .extendCliByGuiCommand()
        .init(prepareData, prepareImages);
};

function prepareData(hermione, reportBuilder) {
    return new Promise((resolve) => {
        hermione.on(hermione.events.TEST_PENDING, (testResult) => reportBuilder.addSkipped(testResult));

        hermione.on(hermione.events.TEST_PASS, (testResult) => reportBuilder.addSuccess(testResult));

        hermione.on(hermione.events.TEST_FAIL, failHandler);

        hermione.on(hermione.events.RETRY, failHandler);

        hermione.on(hermione.events.RUNNER_END, (stats) => resolve(reportBuilder.setStats(stats)));
    });

    function failHandler(testResult) {
        const wrapped = reportBuilder.format(testResult);
        const {assertViewState} = wrapped;

        return wrapped.hasDiff()
            ? reportBuilder.addFail(testResult, {assertViewState})
            : reportBuilder.addError(testResult, {assertViewState});
    }
}

function prepareImages(hermione, pluginConfig, reportBuilder) {
    function handleErrorEvent(testResult) {
        const {assertViewState} = testResult;
        const src = testResult.currentPath;

        return src
            ? utils.copyImageAsync(src, utils.getCurrentAbsolutePath(testResult, pluginConfig.path, assertViewState))
            : saveBase64Screenshot(testResult, pluginConfig.path);
    }

    function failHandler(testResult) {
        const wrapped = reportBuilder.format(testResult);

        return wrapped.hasDiff() ? saveTestImages(wrapped, pluginConfig.path) : handleErrorEvent(wrapped);
    }

    return new Promise((resolve, reject) => {
        let queue = Promise.resolve();

        hermione.on(hermione.events.TEST_PASS, (testResult) => {
            queue = queue.then(() => saveTestImages(reportBuilder.format(testResult), pluginConfig.path));
        });

        hermione.on(hermione.events.RETRY, (testResult) => {
            queue = queue.then(() => failHandler(testResult));
        });

        hermione.on(hermione.events.TEST_FAIL, (testResult) => {
            queue = queue.then(() => failHandler(testResult));
        });

        hermione.on(hermione.events.RUNNER_END, () => queue.then(resolve, reject));
    });
}
