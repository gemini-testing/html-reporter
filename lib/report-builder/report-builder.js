'use strict';

const path = require('path');
const Promise = require('bluebird');
const _ = require('lodash');
const fs = require('fs-extra');

const {IDLE, SUCCESS, FAIL, ERROR, SKIPPED, UPDATED} = require('../constants/test-statuses');

module.exports = class ReportBuilder {
    static create(hermione, pluginConfig) {
        return new ReportBuilder(hermione, pluginConfig);
    }

    constructor(hermione, pluginConfig) {
        this._skips = [];
        this._hermione = hermione;
        this._apiValues = {};
        this._pluginConfig = pluginConfig;
    }

    addIdle(result) {
        return this._addTestResult(this.format(result, IDLE), {status: IDLE});
    }

    addSkipped(result) {
        const formattedResult = this.format(result);

        const {
            suite: {
                skipComment: comment,
                fullName: suite
            },
            browserId: browser
        } = formattedResult;

        this._skips.push({suite, browser, comment});

        return this._addTestResult(formattedResult, {
            status: SKIPPED,
            skipReason: comment
        });
    }

    addSuccess(result) {
        return this._addSuccessResult(this.format(result), SUCCESS);
    }

    addUpdated(result) {
        const formattedResult = this.format(result, UPDATED);

        formattedResult.imagesInfo = (result.imagesInfo || []).map((imageInfo) => {
            const {stateName} = imageInfo;

            return _.extend(imageInfo, formattedResult.getImagesFor(UPDATED, stateName));
        });

        return this._addSuccessResult(formattedResult, UPDATED);
    }

    _addSuccessResult(formattedResult, status) {
        return this._addTestResult(formattedResult, {status});
    }

    addFail(result) {
        return this._addFailResult(this.format(result));
    }

    _addFailResult(formattedResult) {
        return this._addTestResult(formattedResult, {status: FAIL});
    }

    addError(result) {
        return this._addErrorResult(this.format(result));
    }

    _addErrorResult(formattedResult) {
        return this._addTestResult(formattedResult, {
            status: ERROR,
            error: formattedResult.error
        });
    }

    addRetry(result) {
        const formattedResult = this.format(result);

        if (formattedResult.hasDiff()) {
            return this._addFailResult(formattedResult);
        } else {
            return this._addErrorResult(formattedResult);
        }
    }

    setStats(stats) {
        this._stats = stats;

        return this;
    }

    setApiValues(values) {
        this._apiValues = values;

        return this;
    }

    _createTestResult(result, props) {
        const {
            browserId, suite, sessionId, description, imagesInfo, screenshot, multipleTabs, errorDetails
        } = result;

        const {baseHost, saveErrorDetails} = this._pluginConfig;
        const suiteUrl = suite.getUrl({browserId, baseHost});
        const metaInfo = _.merge(_.cloneDeep(result.meta), {url: suite.fullUrl, file: suite.file, sessionId});

        const testResult = Object.assign({
            suiteUrl, name: browserId, metaInfo, description, imagesInfo,
            screenshot: Boolean(screenshot), multipleTabs
        }, props);

        if (saveErrorDetails && errorDetails) {
            testResult.errorDetails = _.pick(errorDetails, ['title', 'filePath']);
        }

        return testResult;
    }

    _copyToReportDir(files, sourceDirectory = path.resolve(__dirname, '../static')) {
        return Promise.map(files, (fileName) => {
            const from = path.resolve(sourceDirectory, fileName);
            const to = path.join(this._pluginConfig.path, fileName);

            return fs.copy(from, to);
        });
    }

    _extendTestWithImagePaths(test, formattedResult, oldImagesInfo = []) {
        const newImagesInfo = formattedResult.getImagesInfo(test.status);

        if (test.status !== UPDATED) {
            return _.set(test, 'imagesInfo', newImagesInfo);
        }

        if (oldImagesInfo.length) {
            test.imagesInfo = oldImagesInfo;
            newImagesInfo.forEach((imageInfo) => {
                const {stateName} = imageInfo;
                let index = _.findIndex(test.imagesInfo, {stateName});
                index = index >= 0 ? index : _.findLastIndex(test.imagesInfo);
                test.imagesInfo[index] = imageInfo;
            });
        }

        return test;
    }
};

