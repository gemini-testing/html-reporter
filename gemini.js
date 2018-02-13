'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

const utils = require('./utils');
const {saveTestImages} = require('./lib/reporter-helpers');
const ReportBuilderFactory = require('./lib/report-builder-factory');
const parseConfig = require('./lib/config');

let reportBuilder;

module.exports = (gemini, opts) => {
    const pluginConfig = parseConfig(opts);

    if (!pluginConfig.enabled) {
        return;
    }

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
    function handleErrorEvent(result) {
        var src = result.imagePath || result.currentPath;

        return src && utils.copyImageAsync(src, utils.getCurrentAbsolutePath(result, pluginConfig.path));
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
                    ? saveTestImages(wrapped, pluginConfig)
                    : handleErrorEvent(wrapped);
            });
        });

        gemini.on(gemini.events.TEST_RESULT, (testResult) => {
            queue = queue.then(() => saveTestImages(reportBuilder.format(testResult), pluginConfig));
        });

        gemini.on(gemini.events.UPDATE_RESULT, (testResult) => {
            testResult = _.extend(testResult, {
                referencePath: testResult.imagePath,
                equal: true
            });

            queue = queue.then(() => saveTestImages(reportBuilder.format(testResult), pluginConfig));
        });

        gemini.on(gemini.events.END, () => queue.then(resolve, reject));
    });
}
