'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

const utils = require('./utils');
const {saveTestImages} = require('./lib/reporter-helpers');
const ReportBuilderFactory = require('./lib/report-builder-factory');
const parseConfig = require('./lib/config');
const gui = require('./lib/gui');

let reportBuilder;

module.exports = (gemini, opts) => {
    const pluginConfig = parseConfig(opts);

    if (!pluginConfig.enabled) {
        return;
    }

    gemini.on(gemini.events.CLI, (commander) => {
        gui(commander, gemini, pluginConfig);
    });

    // TODO: do not generate report on "gemini gui" command
    reportBuilder = ReportBuilderFactory.create('gemini', gemini.config, pluginConfig);
    const generateReportPromise = Promise
        .all([
            prepareData(gemini),
            prepareImages(gemini, pluginConfig)
        ])
        .spread((reportBuilder) => reportBuilder.save())
        .then(utils.logPathToHtmlReport)
        .catch(utils.logError);

    gemini.on(gemini.events.END_RUNNER, () => generateReportPromise);
};

function prepareData(gemini) {
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

function prepareImages(gemini, pluginConfig) {
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
                return wrapped.isEqual()
                    ? saveTestImages(wrapped, reportPath)
                    : handleErrorEvent(wrapped);
            });
        });

        gemini.on(gemini.events.TEST_RESULT, (testResult) => {
            queue = queue.then(() => saveTestImages(reportBuilder.format(testResult), reportPath));
        });

        gemini.on(gemini.events.UPDATE_RESULT, (testResult) => {
            testResult = _.extend(testResult, {
                referencePath: testResult.imagePath,
                equal: true
            });

            queue = queue.then(() => saveTestImages(reportBuilder.format(testResult), reportPath));
        });

        gemini.on(gemini.events.END, () => queue.then(resolve, reject));
    });
}
