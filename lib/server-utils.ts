import { TestAdapterType, ITestResult } from 'typings/test-adapter';
import { IData } from 'typings/data';

const chalk = require('chalk');
const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const {SUCCESS, FAIL, ERROR, UPDATED} = require('./constants/test-statuses');

const getReferencePath = (testResult: TestAdapterType, stateName: string) => createPath('ref', testResult, stateName);
const getCurrentPath = (testResult: TestAdapterType, stateName: string) => createPath('current', testResult, stateName);
const getDiffPath = (testResult: TestAdapterType, stateName: string) => createPath('diff', testResult, stateName);

const getReferenceAbsolutePath = (testResult: TestAdapterType, reportDir: string, stateName: string) => {
    const referenceImagePath = getReferencePath(testResult, stateName);

    return path.resolve(reportDir, referenceImagePath);
};

const getCurrentAbsolutePath = (testResult: TestAdapterType, reportDir: string, stateName: string) => {
    const currentImagePath = getCurrentPath(testResult, stateName);

    return path.resolve(reportDir, currentImagePath);
};

const getDiffAbsolutePath = (testResult: TestAdapterType, reportDir: string, stateName: string) => {
    const diffImagePath = getDiffPath(testResult, stateName);

    return path.resolve(reportDir, diffImagePath);
};

function createPath(kind: string, result: any, stateName: string): string {
    const attempt = result.attempt || 0;
    const imageDir = _.compact(['images', result.imageDir, stateName]);
    const components = imageDir.concat(`${result.browserId}~${kind}_${attempt}.png`);

    return path.join.apply(null, components);
}

function copyImageAsync(srcPath: string, destPath: string) {
    return makeDirFor(destPath)
        .then(() => fs.copy(srcPath, destPath));
}

function saveDiff(result: any, destPath: string): Promise<any> {
    return makeDirFor(destPath)
        .then(() => result.saveDiffTo(destPath));
}

function makeDirFor(destPath: string) {
    return fs.mkdirsAsync(path.dirname(destPath));
}

const logger = _.pick(console, ['log', 'warn', 'error']);

function logPathToHtmlReport(reportBuilder: TestAdapterType) {
    const reportPath = `file://${reportBuilder.reportPath}`;

    logger.log(`Your HTML report is here: ${chalk.yellow(reportPath)}`);
}

function logError(e: Error) {
    logger.error(e.stack);
}

function getPathsFor(status: string, formattedResult: ITestResult, stateName: string) {
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

function hasImage(formattedResult: ITestResult) {
    return !!(formattedResult.getImagesInfo && formattedResult.getImagesInfo(ERROR).length) || !!formattedResult.currentPath || !!formattedResult.screenshot;
}

function prepareCommonJSData(data: IData) {
    return [
        `var data = ${JSON.stringify(data)};`,
        'try { module.exports = data; } catch(e) {}'
    ].join('\n');
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

    require,
    prepareCommonJSData
};
