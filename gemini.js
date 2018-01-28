'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

const utils = require('./utils');
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

    function handleTestResultEvent(testResult) {
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
                    ? handleTestResultEvent(wrapped)
                    : handleErrorEvent(wrapped);
            });
        });

        gemini.on(gemini.events.TEST_RESULT, (testResult) => {
            queue = queue.then(() => handleTestResultEvent(reportBuilder.format(testResult)));
        });

        gemini.on(gemini.events.UPDATE_RESULT, (testResult) => {
            testResult = _.extend(testResult, {
                referencePath: testResult.imagePath,
                equal: true
            });

            queue = queue.then(() => handleTestResultEvent(reportBuilder.format(testResult)));
        });

        gemini.on(gemini.events.END, () => queue.then(resolve, reject));
    });
}
