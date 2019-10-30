'use strict';

const path = require('path');

const chalk = require('chalk');
const _ = require('lodash');
const fs = require('fs-extra');

const {ERROR, UPDATED, IDLE} = require('./constants/test-statuses');
const {IMAGES_PATH} = require('./constants/paths');

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
    const imageDir = _.compact([IMAGES_PATH, result.imageDir, stateName]);
    const components = imageDir.concat(`${result.browserId}~${kind}_${attempt}.png`);

    return path.join.apply(null, components);
}

function copyImageAsync(srcPath, destPath, reportDir = '') {
    return makeDirFor(destPath)
        .then(() => fs.copy(srcPath, path.resolve(reportDir, destPath)));
}

/**
 * @param {String} destPath
 */
function makeDirFor(destPath) {
    return fs.mkdirs(path.dirname(destPath));
}

const logger = _.pick(console, ['log', 'warn', 'error']);

function logPathToHtmlReport(reportBuilder) {
    const reportPath = `file://${reportBuilder.reportPath}`;

    logger.log(`Your HTML report is here: ${chalk.yellow(reportPath)}`);
}

function logError(e) {
    logger.error(`Html-reporter runtime error: ${e.stack}`);
}

function hasImage(formattedResult) {
    return !!formattedResult.getImagesInfo(ERROR).length ||
        !!formattedResult.getCurrImg().path ||
        !!formattedResult.screenshot;
}

function prepareCommonJSData(data) {
    const stringifiedData = JSON.stringify(data, (key, val) => {
        return typeof val === 'function' ? val.toString() : val;
    });

    return [
        `var data = ${stringifiedData};`,
        'try { module.exports = data; } catch(e) {}'
    ].join('\n');
}

function shouldUpdateAttempt(status) {
    return ![UPDATED, IDLE].includes(status);
}

function getDetailsFileName(testId, browserId, attempt) {
    return `${testId}-${browserId}_${Number(attempt) + 1}_${Date.now()}.json`;
}

async function saveStaticFilesToReportDir(hermione, pluginConfig, destPath) {
    const staticFolder = path.resolve(__dirname, './static');
    await fs.ensureDir(destPath);
    await Promise.all([
        fs.writeFile(path.resolve(destPath, 'data.js'), prepareCommonJSData(getConfig(hermione, pluginConfig)), 'utf8'),
        copyToReportDir(destPath, ['report.min.js', 'report.min.css'], staticFolder),
        fs.copy(path.resolve(staticFolder, 'index_sqlite.html'), path.resolve(destPath, 'index.html')),
        fs.copy(require.resolve('@gemini-testing/sql.js'), path.resolve(destPath, 'sql-wasm.js')) // as soon as the pull request to sql.js will be accepted, we will switch to using the original package
    ]).catch(logError);
}

async function createDatabaseUrlsFile(destPath, dbLocations) {
    const data = `window.dbFilePaths = ${JSON.stringify(dbLocations)}`;
    fs.writeFile(path.resolve(destPath, 'databaseUrls.js'), data);
}

function copyToReportDir(destPath, files, sourceDirectory) {
    return Promise.all(files.map(fileName => {
        const from = path.resolve(sourceDirectory, fileName);
        const to = path.resolve(destPath, fileName);
        return fs.copy(from, to);
    }));
}

function getConfig(hermione, pluginConfig) {
    const {defaultView, baseHost, scaleImages, lazyLoadOffset, errorPatterns, metaInfoBaseUrls, databaseUrlsFile} = pluginConfig;

    return {
        skips: [],
        config: {defaultView, baseHost, scaleImages, lazyLoadOffset, errorPatterns, metaInfoBaseUrls, databaseUrlsFile},
        apiValues: hermione.htmlReporter.values,
        date: new Date().toString(),
        saveFormat: 'sqlite'
    };
}

module.exports = {
    getDetailsFileName,

    getReferencePath,
    getCurrentPath,
    getDiffPath,
    hasImage,

    getReferenceAbsolutePath,
    getCurrentAbsolutePath,
    getDiffAbsolutePath,

    copyImageAsync,
    makeDirFor,

    logger,
    logPathToHtmlReport,
    logError,

    require,
    prepareCommonJSData,
    shouldUpdateAttempt,
    saveStaticFilesToReportDir,
    copyToReportDir,
    createDatabaseUrlsFile
};
