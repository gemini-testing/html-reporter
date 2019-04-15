'use strict';

const crypto = require('crypto');
const path = require('path');

const chalk = require('chalk');
const _ = require('lodash');
const fs = require('fs-extra');

const {SUCCESS, FAIL, ERROR, UPDATED} = require('./constants/test-statuses');

const getReferencePath = (testResult, stateName) => createPath('ref', testResult, stateName);
const getCurrentPath = (testResult, stateName) => createPath('current', testResult, stateName);
const getDiffPath = (testResult, stateName) => createPath('diff', testResult, stateName);

const globalCacheDiffImages = new Map();

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

/** parallelize and cache of 'gemini-core.Image.buildDiff' (because it is very slow)
 * @param {Workers} workers
 * @param {ImageDiffError} imageDiffError
 * @param {String} destPath
 * @param {Map} cacheDiffImages
 * @returns {Promise}
 */
async function saveDiffInWorker(workers, imageDiffError, destPath, cacheDiffImages = globalCacheDiffImages) {
    await makeDirFor(destPath);

    const currPath = imageDiffError.currImg.path;
    const refPath = imageDiffError.refImg.path;

    const [currBuffer, refBuffer] = await Promise.all([
        fs.readFile(currPath),
        fs.readFile(refPath)
    ]);

    const hash = createHash(currBuffer) + createHash(refBuffer);

    if (cacheDiffImages.has(hash)) {
        const cachedDiffPath = cacheDiffImages.get(hash);
        await fs.copy(cachedDiffPath, destPath);
        return;
    }

    await workers.exec('saveDiffTo', imageDiffError, destPath);

    cacheDiffImages.set(hash, destPath);
}

function createHash(buffer) {
    return crypto
        .createHash('sha1')
        .update(buffer)
        .digest('base64');
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

function getImagesFor(status, formattedResult, stateName) {
    const refImg = formattedResult.getRefImg(stateName);
    const currImg = formattedResult.getCurrImg(stateName);
    const errImg = formattedResult.getErrImg();

    if (status === SUCCESS || status === UPDATED) {
        return {expectedImg: {path: getReferencePath(formattedResult, stateName), size: refImg.size}};
    }

    if (status === FAIL) {
        return {
            expectedImg: {
                path: getReferencePath(formattedResult, stateName),
                size: refImg.size
            },
            actualImg: {
                path: getCurrentPath(formattedResult, stateName),
                size: currImg.size
            },
            diffImg: {
                path: getDiffPath(formattedResult, stateName),
                size: {
                    width: _.max([_.get(refImg, 'size.width'), _.get(currImg, 'size.width')]),
                    height: _.max([_.get(refImg, 'size.height'), _.get(currImg, 'size.height')])
                }
            }
        };
    }

    if (status === ERROR) {
        return {
            actualImg: {
                path: formattedResult.state ? getCurrentPath(formattedResult, stateName) : '',
                size: currImg.size || errImg.size
            }
        };
    }

    return {};
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

module.exports = {
    getReferencePath,
    getCurrentPath,
    getDiffPath,
    getImagesFor,
    hasImage,

    getReferenceAbsolutePath,
    getCurrentAbsolutePath,
    getDiffAbsolutePath,

    copyImageAsync,
    saveDiff,
    saveDiffInWorker,
    makeDirFor,

    logger,
    logPathToHtmlReport,
    logError,

    require,
    prepareCommonJSData
};
