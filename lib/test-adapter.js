'use strict';

const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const tmp = require('tmp');
const crypto = require('crypto');

const SuiteAdapter = require('./suite-adapter');
const {DB_COLUMNS} = require('./constants/database');
const {getSuitePath} = require('./plugin-utils');
const {getCommandsHistory} = require('./history-utils');
const {SUCCESS, FAIL, ERROR, UPDATED} = require('./constants/test-statuses');
const {ERROR_DETAILS_PATH} = require('./constants/paths');
const {logger, getShortMD5} = require('./common-utils');
const utils = require('./server-utils');

const globalCacheAllImages = new Map();
const globalCacheExpectedPaths = new Map();
const globalCacheDiffImages = new Map();
const testsAttempts = new Map();

function createHash(buffer) {
    return crypto
        .createHash('sha1')
        .update(buffer)
        .digest('base64');
}

module.exports = class TestAdapter {
    static create(testResult = {}, {hermione, sqliteAdapter, status}) {
        return new this(testResult, {hermione, sqliteAdapter, status});
    }

    constructor(testResult, {hermione, sqliteAdapter, status}) {
        this._testResult = testResult;
        this._hermione = hermione;
        this._sqliteAdapter = sqliteAdapter;
        this._errors = this._hermione.errors;
        this._suite = SuiteAdapter.create(this._testResult);
        this._imagesSaver = this._hermione.htmlReporter.imagesSaver;
        this._testId = this._mkTestId();
        this._errorDetails = undefined;
        this._timestamp = this._testResult.timestamp;

        const browserVersion = _.get(this._testResult, 'meta.browserVersion', this._testResult.browserVersion);

        _.set(this._testResult, 'meta.browserVersion', browserVersion);

        if (utils.shouldUpdateAttempt(status)) {
            testsAttempts.set(this._testId, _.isUndefined(testsAttempts.get(this._testId)) ? 0 : testsAttempts.get(this._testId) + 1);
        }

        this._attempt = testsAttempts.get(this._testId) || 0;
    }

    get suite() {
        return this._suite;
    }

    get sessionId() {
        return this._testResult.sessionId || 'unknown session id';
    }

    get browserId() {
        return this._testResult.browserId;
    }

    get imagesInfo() {
        return this._testResult.imagesInfo;
    }

    set imagesInfo(imagesInfo) {
        this._testResult.imagesInfo = imagesInfo;
    }

    _getImgFromStorage(imgPath) {
        // fallback for updating image in gui mode
        return globalCacheAllImages.get(imgPath) || imgPath;
    }

    _getLastImageInfoFromDb(stateName) {
        const browserName = this._testResult.browserId;
        const suitePath = getSuitePath(this._testResult);
        const suitePathString = JSON.stringify(suitePath);

        const imagesInfoResult = this._sqliteAdapter.query({
            select: DB_COLUMNS.IMAGES_INFO,
            where: `${DB_COLUMNS.SUITE_PATH} = ? AND ${DB_COLUMNS.NAME} = ?`,
            orderBy: DB_COLUMNS.TIMESTAMP,
            orderDescending: true
        }, suitePathString, browserName);

        const imagesInfo = imagesInfoResult && JSON.parse(imagesInfoResult[DB_COLUMNS.IMAGES_INFO]) || [];
        return imagesInfo.find(info => info.stateName === stateName);
    }

    _getExpectedPath(stateName, status, cacheExpectedPaths) {
        const key = this._getExpectedKey(stateName);

        if (status === UPDATED) {
            const expectedPath = utils.getReferencePath(this, stateName);
            cacheExpectedPaths.set(key, expectedPath);

            return {path: expectedPath, reused: false};
        }

        if (cacheExpectedPaths.has(key)) {
            return {path: cacheExpectedPaths.get(key), reused: true};
        }

        const imageInfo = this._getLastImageInfoFromDb(stateName);

        if (imageInfo && imageInfo.expectedImg) {
            const expectedPath = imageInfo.expectedImg.path;

            cacheExpectedPaths.set(key, expectedPath);

            return {path: expectedPath, reused: true};
        }

        const expectedPath = utils.getReferencePath(this, stateName);

        cacheExpectedPaths.set(key, expectedPath);

        return {path: expectedPath, reused: false};
    }

    getImagesFor(status, stateName) {
        const refImg = this.getRefImg(stateName);
        const currImg = this.getCurrImg(stateName);
        const errImg = this.getErrImg();

        const {path: refPath} = this._getExpectedPath(stateName, status, globalCacheExpectedPaths);
        const currPath = utils.getCurrentPath(this, stateName);
        const diffPath = utils.getDiffPath(this, stateName);

        if (status === SUCCESS || status === UPDATED) {
            return {expectedImg: {path: this._getImgFromStorage(refPath), size: refImg.size}};
        }

        if (status === FAIL) {
            return {
                expectedImg: {
                    path: this._getImgFromStorage(refPath),
                    size: refImg.size
                },
                actualImg: {
                    path: this._getImgFromStorage(currPath),
                    size: currImg.size
                },
                diffImg: {
                    path: this._getImgFromStorage(diffPath),
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
                    path: this.state ? this._getImgFromStorage(currPath) : '',
                    size: currImg.size || errImg.size
                }
            };
        }

        return {};
    }

    async _saveErrorScreenshot(reportPath) {
        if (!this.screenshot.base64) {
            logger.warn('Cannot save screenshot on reject');

            return Promise.resolve();
        }

        const currPath = utils.getCurrentPath(this);
        const localPath = path.resolve(tmp.tmpdir, currPath);
        await utils.makeDirFor(localPath);
        await fs.writeFile(localPath, new Buffer(this.screenshot.base64, 'base64'), 'base64');

        return this._saveImg(localPath, currPath, reportPath);
    }

    async _saveImg(localPath, destPath, reportDir) {
        if (!localPath) {
            return Promise.resolve();
        }

        const res = await this._imagesSaver.saveImg(localPath, {destPath, reportDir});

        globalCacheAllImages.set(destPath, res || destPath);
        return res;
    }

    get origAttempt() {
        return this._testResult.origAttempt;
    }

    get attempt() {
        return this._attempt;
    }

    set attempt(attemptNum) {
        testsAttempts.set(this._testId, attemptNum);
        this._attempt = attemptNum;
    }

    hasDiff() {
        return this.assertViewResults.some((result) => this.isImageDiffError(result));
    }

    get assertViewResults() {
        return this._testResult.assertViewResults || [];
    }

    isImageDiffError(assertResult) {
        return assertResult instanceof this._errors.ImageDiffError;
    }

    isNoRefImageError(assertResult) {
        return assertResult instanceof this._errors.NoRefImageError;
    }

    getImagesInfo() {
        if (!_.isEmpty(this.imagesInfo)) {
            return this.imagesInfo;
        }

        this.imagesInfo = this.assertViewResults.map((assertResult) => {
            let status, error;

            if (!(assertResult instanceof Error)) {
                status = SUCCESS;
            }

            if (this.isImageDiffError(assertResult)) {
                status = FAIL;
            }

            if (this.isNoRefImageError(assertResult)) {
                status = ERROR;
                error = _.pick(assertResult, ['message', 'stack']);
            }

            const {stateName, refImg, diffClusters} = assertResult;

            return _.extend(
                {stateName, refImg, status, error, diffClusters},
                this.getImagesFor(status, stateName)
            );
        });

        // common screenshot on test fail
        if (this.screenshot) {
            const errorImage = _.extend(
                {status: ERROR, error: this.error},
                this.getImagesFor(ERROR)
            );

            this.imagesInfo.push(errorImage);
        }

        return this.imagesInfo;
    }

    get history() {
        return getCommandsHistory(this._testResult.history);
    }

    get error() {
        return _.pick(this._testResult.err, ['message', 'stack', 'stateName']);
    }

    get imageDir() {
        // TODO: remove toString after publish major version
        return this._testResult.id.toString();
    }

    get state() {
        return {name: this._testResult.title};
    }

    get testPath() {
        return this._suite.path.concat(this._testResult.title);
    }

    get id() {
        return this.testPath.concat(this.browserId, this.attempt).join(' ');
    }

    get screenshot() {
        return _.get(this._testResult, 'err.screenshot');
    }

    get description() {
        return this._testResult.description;
    }

    get meta() {
        return this._testResult.meta;
    }

    get errorDetails() {
        if (!_.isUndefined(this._errorDetails)) {
            return this._errorDetails;
        }

        const details = _.get(this._testResult, 'err.details', null);

        if (details) {
            this._errorDetails = {
                title: details.title || 'error details',
                data: details.data,
                filePath: `${ERROR_DETAILS_PATH}/${utils.getDetailsFileName(
                    this._testResult.id, this._testResult.browserId, this.attempt
                )}`
            };
        } else {
            this._errorDetails = null;
        }

        return this._errorDetails;
    }

    getRefImg(stateName) {
        return _.get(_.find(this.assertViewResults, {stateName}), 'refImg', {});
    }

    getCurrImg(stateName) {
        return _.get(_.find(this.assertViewResults, {stateName}), 'currImg', {});
    }

    getErrImg() {
        return this.screenshot || {};
    }

    prepareTestResult() {
        const {title: name, browserId} = this._testResult;
        const suitePath = getSuitePath(this._testResult);

        return {name, suitePath, browserId};
    }

    get multipleTabs() {
        return true;
    }

    get timestamp() {
        return this._timestamp;
    }

    set timestamp(timestamp) {
        if (!_.isNumber(this._timestamp)) {
            this._timestamp = timestamp;
        }
    }

    async saveErrorDetails(reportPath) {
        if (!this.errorDetails) {
            return;
        }

        const detailsFilePath = path.resolve(reportPath, this.errorDetails.filePath);
        const detailsData = _.isObject(this.errorDetails.data)
            ? JSON.stringify(this.errorDetails.data, null, 2)
            : this.errorDetails.data;

        await utils.makeDirFor(detailsFilePath);
        await fs.writeFile(detailsFilePath, detailsData);
    }

    async saveTestImages(reportPath, workers, cacheExpectedPaths = globalCacheExpectedPaths) {
        const result = await Promise.all(this.assertViewResults.map(async (assertResult) => {
            const {stateName} = assertResult;
            const {path: destRefPath, reused: reusedReference} = this._getExpectedPath(stateName, undefined, cacheExpectedPaths);
            const srcRefPath = this.getRefImg(stateName).path;

            const destCurrPath = utils.getCurrentPath(this, stateName);
            const srcCurrPath = this.getCurrImg(stateName).path || this.getErrImg().path;

            const dstCurrPath = utils.getDiffPath(this, stateName);
            const srcDiffPath = path.resolve(tmp.tmpdir, dstCurrPath);
            const actions = [];

            if (!(assertResult instanceof Error)) {
                actions.push(this._saveImg(srcRefPath, destRefPath, reportPath));
            }

            if (this.isImageDiffError(assertResult)) {
                await this._saveDiffInWorker(assertResult, srcDiffPath, workers);

                actions.push(
                    this._saveImg(srcCurrPath, destCurrPath, reportPath),
                    this._saveImg(srcDiffPath, dstCurrPath, reportPath)
                );

                if (!reusedReference) {
                    actions.push(this._saveImg(srcRefPath, destRefPath, reportPath));
                }
            }

            if (this.isNoRefImageError(assertResult)) {
                actions.push(this._saveImg(srcCurrPath, destCurrPath, reportPath));
            }

            return Promise.all(actions);
        }));

        if (this.screenshot) {
            await this._saveErrorScreenshot(reportPath);
        }

        const htmlReporter = this._hermione.htmlReporter;
        await htmlReporter.emitAsync(htmlReporter.events.TEST_SCREENSHOTS_SAVED, {
            testId: this._testId,
            attempt: this.attempt,
            imagesInfo: this.getImagesInfo()
        });

        return result;
    }

    updateCacheExpectedPath(stateName, expectedPath) {
        const key = this._getExpectedKey(stateName);

        if (expectedPath) {
            globalCacheExpectedPaths.set(key, expectedPath);
        } else {
            globalCacheExpectedPaths.delete(key);
        }
    }

    decreaseAttemptNumber() {
        const testId = this._mkTestId();
        const currentTestAttempt = testsAttempts.get(testId);
        const previousTestAttempt = currentTestAttempt - 1;

        if (previousTestAttempt) {
            testsAttempts.set(testId, previousTestAttempt);
        } else {
            testsAttempts.delete(testId);
        }
    }

    _mkTestId() {
        return this._testResult.fullTitle() + '.' + this._testResult.browserId;
    }

    _getExpectedKey(stateName) {
        const shortTestId = getShortMD5(this._mkTestId());

        return shortTestId + '#' + stateName;
    }

    //parallelize and cache of 'looks-same.createDiff' (because it is very slow)
    async _saveDiffInWorker(imageDiffError, destPath, workers, cacheDiffImages = globalCacheDiffImages) {
        await utils.makeDirFor(destPath);

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

        await workers.saveDiffTo(imageDiffError, destPath);

        cacheDiffImages.set(hash, destPath);
    }
};
