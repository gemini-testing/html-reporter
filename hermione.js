'use strict';

const Promise = require('bluebird');
const fs = require('fs-extra');

const utils = require('./utils');
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

function prepareData(hermione, pluginConfig) {
    return new Promise((resolve) => {
        hermione.config.getBrowserIds().forEach((id) => {
            const browserConfig = hermione.config.forBrowser(id);
            browserConfig.screenshotOnReject = pluginConfig.screenshotOnReject;
        });

        hermione.on(hermione.events.TEST_PENDING, (result) => reportBuilder.addSkipped(result));

        hermione.on(hermione.events.TEST_PASS, (result) => reportBuilder.addSuccess(result));

        hermione.on(hermione.events.TEST_FAIL, (result) => reportBuilder.addError(result));

        hermione.on(hermione.events.RETRY, (result) => reportBuilder.addRetry(result));

        hermione.on(hermione.events.RUNNER_END, (stats) => resolve(reportBuilder.setStats(stats)));
    });
}

function prepareImages(hermione, pluginConfig) {
    function handleErrorEvent(testResult) {
        const src = testResult.currentPath;

        return src
            ? utils.copyImageAsync(src, utils.getCurrentAbsolutePath(testResult, pluginConfig.path))
            : saveScreenshot(testResult.screenshot, utils.getCurrentAbsolutePath(testResult, pluginConfig.path));
    }

    return new Promise((resolve, reject) => {
        let queue = Promise.resolve();

        hermione.on(hermione.events.RETRY, (testResult) => {
            queue = queue.then(() => handleErrorEvent(reportBuilder.format(testResult)));
        });

        hermione.on(hermione.events.TEST_FAIL, (testResult) => {
            queue = queue.then(() => handleErrorEvent(reportBuilder.format(testResult)));
        });

        hermione.on(hermione.events.RUNNER_END, () => queue.then(resolve, reject));
    });
}
