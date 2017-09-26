'use strict';

const path = require('path');
const _ = require('lodash');
const chalk = require('chalk');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs-extra'));

const utils = require('./utils');
const view = require('./lib/view');
const ViewModel = require('./lib/view-model');
const parseConfig = require('./lib/config');
const logger = utils.logger;

/**
 * @param {String} srcPath
 * @param {String} destPath
 * @returns {Promise}
 */
function copyImage(srcPath, destPath) {
    return makeDirFor(destPath)
        .then(() => fs.copyAsync(srcPath, destPath));
}

/**
 * @param {TestStateResult} result
 * @param {String} destPath
 * @returns {Promise}
 */
function saveDiff(result, destPath) {
    return makeDirFor(destPath)
        .then(() => result.saveDiffTo(destPath));
}

/**
 * @param {String} destPath
 */
function makeDirFor(destPath) {
    return fs.mkdirsAsync(path.dirname(destPath));
}

function prepareViewData(gemini, pluginConfig) {
    return new Promise((resolve) => {
        var model = new ViewModel(gemini.config, pluginConfig);

        gemini.on(gemini.events.SKIP_STATE, model.addSkipped.bind(model));

        gemini.on(gemini.events.TEST_RESULT, (result) => {
            result.equal ? model.addSuccess(result) : model.addFail(result);
        });

        gemini.on(gemini.events.UPDATE_RESULT, (result) => model.addSuccess(result));

        gemini.on(gemini.events.RETRY, model.addRetry.bind(model));

        gemini.on(gemini.events.ERROR, model.addError.bind(model));

        gemini.on(gemini.events.END, (stats) => resolve(model.getResult(stats)));
    });
}

function logError(e) {
    logger.error(e.stack);
}

function logPathToHtmlReport(reportDir) {
    const reportPath = `file://${path.resolve(`${reportDir}/index.html`)}`;

    logger.log(`Your HTML report is here: ${chalk.yellow(reportPath)}`);
}

function prepareImages(gemini, pluginConfig) {
    const reportDir = pluginConfig.path;

    function handleTestResultEvent_(testResult) {
        if (pluginConfig.errorsOnly && testResult.equal) {
            return Promise.resolve();
        }

        const actions = [
            copyImage(testResult.referencePath, utils.getReferenceAbsolutePath(testResult, reportDir))
        ];

        if (!testResult.equal) {
            actions.push(
                copyImage(testResult.currentPath, utils.getCurrentAbsolutePath(testResult, reportDir)),
                saveDiff(testResult, utils.getDiffAbsolutePath(testResult, reportDir))
            );
        }

        return Promise.all(actions);
    }

    function handleErrorEvent_(testResult) {
        var src = testResult.imagePath || testResult.currentPath;

        return src && copyImage(src, utils.getCurrentAbsolutePath(testResult, reportDir));
    }

    return new Promise((resolve, reject) => {
        let queue = Promise.resolve(true);

        gemini.on(gemini.events.ERROR, (testResult) => {
            queue = queue.then(() => handleErrorEvent_(testResult));
        });

        gemini.on(gemini.events.RETRY, (testResult) => {
            queue = queue.then(() => {
                return testResult.hasOwnProperty('equal')
                    ? handleTestResultEvent_(testResult)
                    : handleErrorEvent_(testResult);
            });
        });

        gemini.on(gemini.events.TEST_RESULT, function(testResult) {
            queue = queue.then(() => handleTestResultEvent_(testResult));
        });

        gemini.on(gemini.events.UPDATE_RESULT, function(testResult) {
            testResult = _.extend(testResult, {
                referencePath: testResult.imagePath,
                equal: true
            });

            queue = queue.then(() => handleTestResultEvent_(testResult));
        });

        gemini.on(gemini.events.END, () => {
            queue.then(resolve, reject);
        });
    });
}

function prepareEventLog(gemini, pluginConfig) {
    const reportDir = pluginConfig.path;

    return new Promise((resolve) => {
        const eventLog = [];

        gemini.on(gemini.events.BEGIN_SUITE, (event) => eventLog.push({name: gemini.events.BEGIN_SUITE, data: event}));
        gemini.on(gemini.events.BEGIN_STATE, (event) => eventLog.push({name: gemini.events.BEGIN_STATE, data: event}));
        gemini.on(gemini.events.SKIP_STATE, (event) => eventLog.push({name: gemini.events.SKIP_STATE, data: event}));
        gemini.on(gemini.events.END_TEST, (event) => {
            // order is not guaranteed
            // so we need to rewrite these paths
            // and to do it in event data copy because rewriting these paths breaks images saving when occurs before it
            eventLog.push({name: gemini.events.END_TEST, data: Object.assign({}, event, {
                currentPath: utils.getCurrentAbsolutePath(event, reportDir),
                diffPath: utils.getDiffAbsolutePath(event, reportDir)
            })});
        });
        gemini.on(gemini.events.END_STATE, (event) => eventLog.push({name: gemini.events.END_STATE, data: event}));
        gemini.on(gemini.events.END_SUITE, (event) => eventLog.push({name: gemini.events.END_SUITE, data: event}));

        gemini.on(gemini.events.END, () => resolve(eventLog));
    });
}

module.exports = (gemini, opts) => {
    const pluginConfig = parseConfig(opts);

    if (!pluginConfig.enabled) {
        return;
    }

    const generateReportPromise = Promise
        .all([
            prepareViewData(gemini, pluginConfig),
            prepareImages(gemini, pluginConfig),
            prepareEventLog(gemini, pluginConfig)
        ])
        .spread((model, images, events) => Promise.all([
            view.createHtml(model),
            model,
            events
        ]))
        .spread((html, model, events) => Promise.all([
            view.save(html, pluginConfig.path),
            fs.outputJson(path.join(pluginConfig.path, 'report.json'), model),
            fs.outputJson(path.join(pluginConfig.path, 'events.json'), events)
        ]))
        .then(() => logPathToHtmlReport(pluginConfig.path))
        .catch(logError);

    gemini.on(gemini.events.END_RUNNER, () => generateReportPromise.thenReturn());
};
