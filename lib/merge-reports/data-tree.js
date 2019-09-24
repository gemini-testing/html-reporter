'use strict';

const path = require('path');
const _ = require('lodash');
const Promise = require('bluebird');
const fs = require('fs-extra');
const {findNode, setStatusForBranch} = require('../static/modules/utils');
const {collectBrowsersFrom, getStatNameForStatus, getImagePaths, isAbsoluteUrl} = require('./utils');
const {logger} = require('../server-utils');

const defaults = (data) => _.defaults(data, {suites: [], skips: [], config: {}});

module.exports = class DataTree {
    static create(initialData, destPath) {
        return new DataTree(initialData, destPath);
    }

    constructor(initialData, destPath) {
        this._data = defaults(initialData);
        this._destPath = destPath;
    }

    async mergeWith(dataCollection) {
        // make it serially in order to perform correct merge/permutation of images and datas
        await Promise.each(_.toPairs(dataCollection), async ([path, data]) => {
            data = defaults(data);
            this._srcPath = path;
            this._mergeSkips(data.skips);

            await this._mergeSuites(data.suites);
        });

        return this._data;
    }

    _mergeSkips(srcSkips) {
        srcSkips.forEach((skip) => {
            if (!_.find(this._data.skips, {suite: skip.suite, browser: skip.browser})) {
                this._data.skips.push(skip);
            }
        });
    }

    async _mergeSuites(srcSuites) {
        await Promise.map(srcSuites, async (suite) => {
            await this._mergeSuiteResult(suite);
        });
    }

    async _mergeSuiteResult(suite) {
        const existentSuite = findNode(this._data.suites, suite.suitePath);

        if (!existentSuite) {
            return await this._addSuiteResult(suite);
        }

        if (suite.children) {
            await Promise.map(suite.children, (childSuite) => this._mergeSuiteResult(childSuite));
        }

        if (suite.browsers) {
            await this._mergeBrowserResult(suite);
        }
    }

    async _mergeBrowserResult(suite) {
        await Promise.map(suite.browsers, async (bro) => {
            const existentBro = this._findBrowserResult(suite.suitePath, bro.name);

            if (!existentBro) {
                return await this._addBrowserResult(bro, suite.suitePath);
            }

            this._moveTestResultToRetries(existentBro);
            await this._addTestRetries(existentBro, bro.retries);
            await this._changeTestResult(existentBro, bro.result, suite.suitePath);
        });
    }

    async _addSuiteResult(suite) {
        if (suite.suitePath.length === 1) {
            this._data.suites.push(suite);
        } else {
            const parentSuitePath = suite.suitePath.slice(0, -1);
            const existentParentSuite = findNode(this._data.suites, parentSuitePath);
            existentParentSuite.children = existentParentSuite.children || [];
            existentParentSuite.children.push(suite);
            setStatusForBranch(this._data.suites, parentSuitePath);
        }

        this._mergeSuiteStatistics(suite);
        await this._moveImages(suite, {fromFields: ['result', 'retries']});
    }

    async _addBrowserResult(bro, suitePath) {
        const existentParentSuite = findNode(this._data.suites, suitePath);
        existentParentSuite.browsers = existentParentSuite.browsers || [];
        existentParentSuite.browsers.push(bro);

        setStatusForBranch(this._data.suites, suitePath);

        this._mergeBrowserStatistics(bro);
        await this._moveImages(bro, {fromFields: ['result', 'retries']});
    }

    _moveTestResultToRetries(existentBro) {
        existentBro.retries.push(existentBro.result);

        this._increaseRetries(existentBro.name);
        this._decreaseStats(existentBro.name, existentBro.result.status);
    }

    async _addTestRetries(existentBro, retries) {
        await Promise.mapSeries(retries, (retry) => this._addTestRetry(existentBro, retry));
    }

    async _addTestRetry(existentBro, retry) {
        const newAttempt = existentBro.retries.length;

        await this._moveImages(retry, {newAttempt});
        retry = this._changeFieldsWithAttempt(retry, {newAttempt});

        existentBro.retries.push(retry);
        this._increaseRetries(existentBro.name);
    }

    async _changeTestResult(existentBro, result, suitePath) {
        await this._moveImages(result, {newAttempt: existentBro.retries.length});
        existentBro.result = this._changeFieldsWithAttempt(result, {newAttempt: existentBro.retries.length});

        this._increaseStats(existentBro.name, existentBro.result.status);

        setStatusForBranch(this._data.suites, suitePath);
    }

    _mergeSuiteStatistics(suite) {
        const browsers = collectBrowsersFrom(suite);

        for (const bro of browsers) {
            this._mergeBrowserStatistics(bro);
        }
    }

    _mergeBrowserStatistics(bro) {
        if (getStatNameForStatus(_.get(bro, 'result.status'))) {
            this._increaseTotal(bro.name);
            this._increaseStats(bro.name, bro.result.status);
        }
        if (bro.retries && bro.retries.length > 0) {
            this._increaseRetries(bro.name, bro.retries.length);
        }
    }

    async _moveImages(node, {newAttempt, fromFields}) {
        await Promise.map(getImagePaths(node, fromFields), async (imgPath) => {
            if (isAbsoluteUrl(imgPath)) {
                return;
            }

            const srcImgPath = path.resolve(this._srcPath, imgPath);
            const destImgPath = path.resolve(
                this._destPath,
                _.isNumber(newAttempt) ? imgPath.replace(/\d+(?=.png$)/, newAttempt) : imgPath
            );

            try {
                await fs.move(srcImgPath, destImgPath, {overwrite: true});
            } catch (e) {
                logger.error(`The image was not moved from ${srcImgPath} to ${destImgPath}:`, e);
            }
        });
    }

    _changeFieldsWithAttempt(testResult, {newAttempt}) {
        const imagesInfo = testResult.imagesInfo.map((imageInfo) => {
            return _.mapValues(imageInfo, (val, key) => {
                if (['expectedImg', 'actualImg', 'diffImg'].includes(key) && !isAbsoluteUrl(val.path)) {
                    val.path = val.path.replace(/\d+(?=.png)/, newAttempt);
                }

                return val;
            });
        });

        return _.extend({}, testResult, {attempt: newAttempt, imagesInfo});
    }

    _findBrowserResult(suitePath, browserId) {
        const existentNode = findNode(this._data.suites, suitePath);
        return _.find(_.get(existentNode, 'browsers'), {name: browserId});
    }

    _changeStatsByStatName(browserName, statName, value) {
        this._data[statName] += value;

        // stats per browser
        if (!this._data.hasOwnProperty('perBrowser')) {
            this._data.perBrowser = {};
        }
        if (!this._data.perBrowser.hasOwnProperty(browserName)) {
            this._data.perBrowser[browserName] = {
                'total': 0,
                'passed': 0,
                'failed': 0,
                'skipped': 0,
                'retries': 0
            };
        }
        this._data.perBrowser[browserName][statName] += value;
    }

    _increaseRetries(browserName, value = 1) {
        this._changeStatsByStatName(browserName, 'retries', value);
    }

    _increaseTotal(browserName) {
        this._changeStatsByStatName(browserName, 'total', 1);
    }

    _increaseStats(browserName, status) {
        const statName = getStatNameForStatus(status);

        this._changeStatsByStatName(browserName, statName, 1);
    }

    _decreaseStats(browserName, status) {
        const statName = getStatNameForStatus(status);

        this._changeStatsByStatName(browserName, statName, -1);
    }
};
