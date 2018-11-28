'use strict';
var chalk = require('chalk');
var _ = require('lodash');
var path = require('path');
var fs = require('fs-extra');
var _a = require('./constants/test-statuses'), SUCCESS = _a.SUCCESS, FAIL = _a.FAIL, ERROR = _a.ERROR, UPDATED = _a.UPDATED;
var getReferencePath = function (testResult, stateName) { return createPath('ref', testResult, stateName); };
var getCurrentPath = function (testResult, stateName) { return createPath('current', testResult, stateName); };
var getDiffPath = function (testResult, stateName) { return createPath('diff', testResult, stateName); };
var getReferenceAbsolutePath = function (testResult, reportDir, stateName) {
    var referenceImagePath = getReferencePath(testResult, stateName);
    return path.resolve(reportDir, referenceImagePath);
};
var getCurrentAbsolutePath = function (testResult, reportDir, stateName) {
    var currentImagePath = getCurrentPath(testResult, stateName);
    return path.resolve(reportDir, currentImagePath);
};
var getDiffAbsolutePath = function (testResult, reportDir, stateName) {
    var diffImagePath = getDiffPath(testResult, stateName);
    return path.resolve(reportDir, diffImagePath);
};
/**
 * @param {String} kind - одно из значений 'ref', 'current', 'diff'
 * @param {StateResult} result
 * @param {String} stateName - имя стэйта для теста
 * @returns {String}
 */
function createPath(kind, result, stateName) {
    var attempt = result.attempt || 0;
    var imageDir = _.compact(['images', result.imageDir, stateName]);
    var components = imageDir.concat(result.browserId + "~" + kind + "_" + attempt + ".png");
    return path.join.apply(null, components);
}
function copyImageAsync(srcPath, destPath) {
    return makeDirFor(destPath)
        .then(function () { return fs.copy(srcPath, destPath); });
}
/**
 * @param {TestStateResult} result
 * @param {String} destPath
 * @returns {Promise}
 */
function saveDiff(result, destPath) {
    return makeDirFor(destPath)
        .then(function () { return result.saveDiffTo(destPath); });
}
/**
 * @param {String} destPath
 */
function makeDirFor(destPath) {
    return fs.mkdirsAsync(path.dirname(destPath));
}
var logger = _.pick(console, ['log', 'warn', 'error']);
function logPathToHtmlReport(reportBuilder) {
    var reportPath = "file://" + reportBuilder.reportPath;
    logger.log("Your HTML report is here: " + chalk.yellow(reportPath));
}
function logError(e) {
    logger.error(e.stack);
}
function getPathsFor(status, formattedResult, stateName) {
    if (status === SUCCESS || status === UPDATED) {
        return { expectedPath: getReferencePath(formattedResult, stateName) };
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
function prepareCommonJSData(data) {
    return [
        "var data = " + JSON.stringify(data) + ";",
        'try { module.exports = data; } catch(e) {}'
    ].join('\n');
}
module.exports = {
    getReferencePath: getReferencePath,
    getCurrentPath: getCurrentPath,
    getDiffPath: getDiffPath,
    getPathsFor: getPathsFor,
    hasImage: hasImage,
    getReferenceAbsolutePath: getReferenceAbsolutePath,
    getCurrentAbsolutePath: getCurrentAbsolutePath,
    getDiffAbsolutePath: getDiffAbsolutePath,
    copyImageAsync: copyImageAsync,
    saveDiff: saveDiff,
    makeDirFor: makeDirFor,
    logger: logger,
    logPathToHtmlReport: logPathToHtmlReport,
    logError: logError,
    require: require,
    prepareCommonJSData: prepareCommonJSData
};
//# sourceMappingURL=server-utils.js.map