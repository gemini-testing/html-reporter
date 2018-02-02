'use strict';

const chalk = require('chalk');
const _ = require('lodash');
const path = require('path');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs-extra'));

const getReferencePath = (testResult) => createPath('ref', testResult);
const getCurrentPath = (testResult) => createPath('current', testResult);
const getDiffPath = (testResult) => createPath('diff', testResult);

const getReferenceAbsolutePath = (testResult, reportDir) => {
    const referenceImagePath = getReferencePath(testResult);

    return path.resolve(reportDir, referenceImagePath);
};

const getCurrentAbsolutePath = (testResult, reportDir) => {
    const currentImagePath = getCurrentPath(testResult);

    return path.resolve(reportDir, currentImagePath);
};

const getDiffAbsolutePath = (testResult, reportDir) => {
    const diffImagePath = getDiffPath(testResult);

    return path.resolve(reportDir, diffImagePath);
};

/**
 * @param {String} kind - одно из значение 'ref', 'current', 'diff'
 * @param {StateResult} result
 * @returns {String}
 */
function createPath(kind, result) {
    const retrySuffix = _.isUndefined(result.attempt) ? '' : `_${result.attempt}`;
    const components = [].concat(
        'images',
        result.imageDir,
        `${result.browserId}~${kind}${retrySuffix}.png`
    );

    const pathToImage = path.join.apply(null, components);

    return pathToImage;
}

function copyImageAsync(srcPath, destPath) {
    return makeDirFor(destPath)
        .then(() => fs.copy(srcPath, destPath));
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

const logger = _.pick(console, ['log', 'warn', 'error']);

function logPathToHtmlReport(reportBuilder) {
    const reportPath = `file://${reportBuilder.reportPath}`;

    logger.log(`Your HTML report is here: ${chalk.yellow(reportPath)}`);
}

function logError(e) {
    logger.error(e.stack);
}

module.exports = {
    getReferencePath,
    getCurrentPath,
    getDiffPath,

    getReferenceAbsolutePath,
    getCurrentAbsolutePath,
    getDiffAbsolutePath,

    copyImageAsync,
    saveDiff,
    makeDirFor,

    logger,
    logPathToHtmlReport,
    logError
};
