'use strict';

const os = require('os');

const PQueue = require('p-queue');

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
                .setApiValues(hermione.htmlReporter.values)
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
        const queue = new PQueue({concurrency: os.cpus().length});
        const promises = [];

        hermione.on(hermione.events.TEST_PASS, testResult => {
            promises.push(queue .add(() => saveTestImages(reportBuilder.format(testResult), reportPath)).catch(reject));
        });

        hermione.on(hermione.events.RETRY, testResult => {
            promises.push(queue.add(() => failHandler(testResult)).catch(reject));
        });

        hermione.on(hermione.events.TEST_FAIL, testResult => {
            promises.push(queue.add(() => failHandler(testResult)).catch(reject));
        });

        hermione.on(hermione.events.TEST_PENDING, testResult => {
            promises.push(queue.add(() => failHandler(testResult)).catch(reject));
        });

        hermione.on(hermione.events.RUNNER_END, () =>
            Promise.all(promises).then(resolve, reject)
        );
    });
}
