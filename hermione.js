'use strict';

const Promise = require('bluebird');
const fs = require('fs-extra');

const utils = require('./lib/server-utils');
const {saveTestImages} = require('./lib/reporter-helpers');
const ReportBuilderFactory = require('./lib/report-builder-factory');
const parseConfig = require('./lib/config');

let reportBuilder;

module.exports = (hermione, opts) => {
    const pluginConfig = parseConfig(opts);

    if (!pluginConfig.enabled) {
        return;
    }

    reportBuilder = ReportBuilderFactory.create('hermione', hermione.config, pluginConfig);
    const generateReportPromise = Promise
        .all([
            prepareData(hermione, pluginConfig),
            prepareImages(hermione, pluginConfig)
        ])
        .spread((reportBuilder) => reportBuilder.save())
        .then(utils.logPathToHtmlReport)
        .catch(utils.logError);

    hermione.on(hermione.events.RUNNER_END, () => generateReportPromise);
};

function saveScreenshot(imageData, destPath) {
    if (!imageData) {
        utils.logger.warn('Cannot save screenshot on reject');

        return Promise.resolve();
    }

    return utils.makeDirFor(destPath)
        .then(() => fs.writeFileAsync(destPath, new Buffer(imageData, 'base64'), 'base64'));
}

function prepareData(hermione) {
    return new Promise((resolve) => {
        hermione.on(hermione.events.TEST_PENDING, (testResult) => reportBuilder.addSkipped(testResult));

        hermione.on(hermione.events.TEST_PASS, (testResult) => reportBuilder.addSuccess(testResult));

        hermione.on(hermione.events.TEST_FAIL, failHandler);

        hermione.on(hermione.events.RETRY, failHandler);

        hermione.on(hermione.events.RUNNER_END, (stats) => resolve(reportBuilder.setStats(stats)));
    });

    function failHandler(testResult) {
        const wrapped = reportBuilder.format(testResult);

        return wrapped.hasDiff ? reportBuilder.addFail(testResult) : reportBuilder.addError(testResult);
    }
}

function prepareImages(hermione, pluginConfig) {
    function handleErrorEvent(testResult) {
        const src = testResult.currentPath;

        return src
            ? utils.copyImageAsync(src, utils.getCurrentAbsolutePath(testResult, pluginConfig.path))
            : saveScreenshot(testResult.screenshot, utils.getCurrentAbsolutePath(testResult, pluginConfig.path));
    }

    function failHandler(testResult) {
        const wrapped = reportBuilder.format(testResult);

        return wrapped.hasDiff ? saveTestImages(wrapped, pluginConfig.path) : handleErrorEvent(wrapped);
    }

    return new Promise((resolve, reject) => {
        let queue = Promise.resolve();

        hermione.on(hermione.events.RETRY, (testResult) => {
            queue = queue.then(() => failHandler(testResult));
        });

        hermione.on(hermione.events.TEST_FAIL, (testResult) => {
            queue = queue.then(() => failHandler(testResult));
        });

        hermione.on(hermione.events.RUNNER_END, () => queue.then(resolve, reject));
    });
}
