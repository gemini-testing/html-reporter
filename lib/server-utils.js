'use strict';

const chalk = require('chalk');
const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const {SUCCESS, FAIL, ERROR, UPDATED} = require('./constants/test-statuses');

const getReferencePath = (testResult, stateName) => createPath('ref', testResult, stateName);
const getCurrentPath = (testResult, stateName) => createPath('current', testResult, stateName);
const getDiffPath = (testResult, stateName) => createPath('diff', testResult, stateName);

const getReferenceAbsolutePath = (testResult, reportDir, stateName) => {
    const referenceImagePath = getReferencePath(testResult, stateName);

    return path.resolve(reportDir, referenceImagePath);
};

const getCurrentAbsolutePath = (testResult, reportDir, stateName) => {
    const currentImagePath = getCurrentPath(testResult, stateName);

    return path.resolve(reportDir, currentImagePath);
};

const getDiffAbsolutePath = (testResult, reportDir, stateName) => {
    const diffImagePath = getDiffPath(testResult, stateName);

    return path.resolve(reportDir, diffImagePath);
};

/**
 * @param {String} kind - одно из значений 'ref', 'current', 'diff'
 * @param {StateResult} result
 * @param {String} stateName - имя стэйта для теста
 * @returns {String}
 */
function createPath(kind, result, stateName) {
    const attempt = result.attempt || 0;
    const imageDir = _.compact(['images', result.imageDir, stateName]);
    const components = imageDir.concat(`${result.browserId}~${kind}_${attempt}.png`);

    return path.join.apply(null, components);
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

function getPathsFor(status, formattedResult, stateName) {
    if (status === SUCCESS || status === UPDATED) {
        return {expectedPath: getReferencePath(formattedResult, stateName)};
    }
    if (status === FAIL) {
        return {
            actualPath: getCurrentPath(formattedResult, stateName),
            expectedPath: getReferencePath(formattedResult, stateName),
            diffPath: getDiffPath(formattedResult, stateName)
        };
    }
    if (status === ERROR) {
        return {
            actualPath: formattedResult.state ? getCurrentPath(formattedResult, stateName) : ''
        };
    }

    return {};
}

function hasImage(formattedResult) {
    return !!formattedResult.getImagesInfo(ERROR).length || !!formattedResult.currentPath || !!formattedResult.screenshot;
}

module.exports = {
    getReferencePath,
    getCurrentPath,
    getDiffPath,
    getPathsFor,
    hasImage,

    getReferenceAbsolutePath,
    getCurrentAbsolutePath,
    getDiffAbsolutePath,

    copyImageAsync,
    saveDiff,
    makeDirFor,

    logger,
    logPathToHtmlReport,
    logError,

    require
};
