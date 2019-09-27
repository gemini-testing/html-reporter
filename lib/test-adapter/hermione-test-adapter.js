'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const path = require('path');

const tmp = require('tmp');
const TestAdapter = require('./test-adapter');
const HermioneSuiteAdapter = require('../suite-adapter/hermione-suite-adapter.js');
const {getSuitePath} = require('../plugin-utils').getHermioneUtils();
const {SUCCESS, FAIL, ERROR} = require('../constants/test-statuses');
const {ERROR_DETAILS_PATH} = require('../constants/paths');
const utils = require('../server-utils');
const fs = require('fs-extra');
const crypto = require('crypto');

function createHash(buffer) {
    return crypto
        .createHash('sha1')
        .update(buffer)
        .digest('base64');
}

const globalCacheDiffImages = new Map();
const testsAttempts = new Map();

module.exports = class HermioneTestResultAdapter extends TestAdapter {
    constructor(testResult, tool, status) {
        super(testResult, tool, status);

        this._tool = tool;
        this._errors = this._tool.errors;
        this._suite = HermioneSuiteAdapter.create(this._testResult);
        this._imagesSaver = this._tool.htmlReporter.imagesSaver;
        this._testId = `${this._testResult.fullTitle()}.${this._testResult.browserId}`;
        this._errorDetails = undefined;

        if (utils.shouldUpdateAttempt(status)) {
            testsAttempts.set(this._testId, _.isUndefined(testsAttempts.get(this._testId)) ? 0 : testsAttempts.get(this._testId) + 1);
        }

        this._attempt = testsAttempts.get(this._testId) || 0;
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

    // hack which should be removed when html-reporter is able to show all assert view fails for one test
    get _firstAssertViewFail() {
        return _.find(this._testResult.assertViewResults, (result) => result instanceof Error);
    }

    get error() {
        return _.pick(this._testResult.err, ['message', 'stack', 'stateName']);
    }

    get imageDir() {
        return this._testResult.id();
    }

    get state() {
        return {name: this._testResult.title};
    }

    get screenshot() {
        return _.get(this._testResult, 'err.screenshot');
    }

    get assertViewState() {
        return this._firstAssertViewFail
            ? _.get(this._firstAssertViewFail, 'stateName')
            : _.get(this._testResult, 'err.stateName');
    }

    get description() {
        return this._testResult.description;
    }

    get meta() {
        return this._testResult.meta;
    }

    get errorDetails() {
        if (this._errorDetails !== undefined) {
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

    async saveErrorDetails(reportPath) {
        if (!this.errorDetails) {
            return;
        }

        const detailsFilePath = `${path.resolve(reportPath)}/${this.errorDetails.filePath}`;
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
