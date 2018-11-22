'use strict';

const Promise = require('bluebird');
const PluginAdapter = require('./lib/plugin-adapter');
const {saveTestImages, saveBase64Screenshot} = require('./lib/reporter-helpers');

module.exports = (hermione, opts) => {
    const plugin = PluginAdapter.create(hermione, opts, 'hermione');

    if (!plugin.isEnabled()) {
        return;
    }

    plugin
        .addApi()
        .addCliCommands()
        .init(prepareData, prepareImages);
};

function prepareData(hermione, reportBuilder) {
    return new Promise((resolve) => {
        hermione.on(hermione.events.TEST_PENDING, (testResult) => reportBuilder.addSkipped(testResult));

        hermione.on(hermione.events.TEST_PASS, (testResult) => reportBuilder.addSuccess(testResult));

        hermione.on(hermione.events.TEST_FAIL, failHandler);

        hermione.on(hermione.events.RETRY, failHandler);

        hermione.on(hermione.events.RUNNER_END, (stats) => resolve(
            reportBuilder
                .setStats(stats)
                .setExtraItems(hermione.htmlReporter.extraItems)
        ));
    });

    function failHandler(testResult) {
        const formattedResult = reportBuilder.format(testResult);

        return formattedResult.hasDiff()
            ? reportBuilder.addFail(testResult)
            : reportBuilder.addError(testResult);
    }
}

function prepareImages(hermione, pluginConfig, reportBuilder) {
    const {path: reportPath} = pluginConfig;

    function failHandler(testResult) {
        const formattedResult = reportBuilder.format(testResult);
        const actions = [saveTestImages(formattedResult, reportPath)];

        if (formattedResult.screenshot) {
            actions.push(saveBase64Screenshot(formattedResult, reportPath));
        }

        return Promise.all(actions);
    }

    return new Promise((resolve, reject) => {
        let queue = Promise.resolve();

        hermione.on(hermione.events.TEST_PASS, (testResult) => {
            queue = queue.then(() => saveTestImages(reportBuilder.format(testResult), reportPath));
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
