'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const tmp = require('tmp');
const crypto = require('crypto');

const SuiteAdapter = require('./suite-adapter');
const {getSuitePath} = require('./plugin-utils').getHermioneUtils();
const {getCommandHistory} = require('./history-utils');
const {SUCCESS, FAIL, ERROR, UPDATED} = require('./constants/test-statuses');
const {ERROR_DETAILS_PATH} = require('./constants/paths');
const utils = require('./server-utils');

const globalCacheAllImages = new Map();

function createHash(buffer) {
    return crypto
        .createHash('sha1')
        .update(buffer)
        .digest('base64');
}

const globalCacheDiffImages = new Map();
const testsAttempts = new Map();

module.exports = class TestAdapter {
    static create(testResult = {}, hermione, pluginConfig, status) {
        return new this(testResult, hermione, pluginConfig, status);
    }

    constructor(testResult, hermione, pluginConfig, status) {
        this._testResult = testResult;
        this._hermione = hermione;
        this._pluginConfig = pluginConfig;
        this._errors = this._hermione.errors;
        this._suite = SuiteAdapter.create(this._testResult);
        this._imagesSaver = this._hermione.htmlReporter.imagesSaver;
        this._testId = `${this._testResult.fullTitle()}.${this._testResult.browserId}`;
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

    getImagesFor(status, stateName) {
        const refImg = this.getRefImg(stateName);
        const currImg = this.getCurrImg(stateName);
        const errImg = this.getErrImg();

        const refPath = utils.getReferencePath(this, stateName);
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

    async saveBase64Screenshot(reportPath) {
        if (!this.screenshot.base64) {
            utils.logger.warn('Cannot save screenshot on reject');

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

    get error() {
        const err = _.pick(this._testResult.err, ['message', 'stack', 'history', 'stateName']);
        const {file} = this._testResult;
        const {commandsWithShortHistory} = this._pluginConfig;

        if (err.history) {
            err.history = getCommandHistory(err.history, file, commandsWithShortHistory);
        }

        return err;
    }

    get imageDir() {
        return this._testResult.id();
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

    saveTestImages(reportPath, workers) {
        return Promise.map(this.assertViewResults, async (assertResult) => {
            const {stateName} = assertResult;
            const destRefPath = utils.getReferencePath(this, stateName);
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
                    this._saveImg(srcDiffPath, dstCurrPath, reportPath),
                    this._saveImg(srcRefPath, destRefPath, reportPath)
                );
            }

            if (this.isNoRefImageError(assertResult)) {
                actions.push(this._saveImg(srcCurrPath, destCurrPath, reportPath));
            }

            return Promise.all(actions);
        });
    }

    //parallelize and cache of 'gemini-core.Image.buildDiff' (because it is very slow)
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
