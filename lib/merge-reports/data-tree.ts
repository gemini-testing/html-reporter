import path from 'path';
import _ from 'lodash';
// @ts-ignore
import Promise from 'bluebird';
const fs = Promise.promisifyAll(require('fs-extra'));

import {IData} from 'typings/data';
import { ISuite, IBrowser } from 'typings/suite-adapter';
import { ITestResult } from 'typings/test-adapter';
import { INode } from 'typings/node';

const {isSkippedStatus} = require('../common-utils');
const {findNode, setStatusForBranch} = require('../static/modules/utils');
const {getDataFrom, getStatNameForStatus, getImagePaths} = require('./utils');

module.exports = class DataTree {
    protected _srcPath: string;

    static create(initialData: IData, destPath: string) {
        return new DataTree(initialData, destPath);
    }

    constructor(
        // initialData
        protected _data: IData,
        protected _destPath: string
    ) {}

    async mergeWith(dataCollection: any) {
        // make it serially in order to perform correct merge/permutation of images and datas
        await Promise.each(_.toPairs(dataCollection), async ([path, data]: any) => {
            this._srcPath = path;
            this._mergeSkips(data.skips);

            await this._mergeSuites(data.suites);
        });

        return this._data;
    }

    _mergeSkips(srcSkips: any[]) {
        srcSkips.forEach((skip) => {
            if (!_.find(this._data.skips, {suite: skip.suite, browser: skip.browser})) {
                this._data.skips.push(skip);
            }
        });
    }

    async _mergeSuites(srcSuites: ISuite[]) {
        await Promise.map(srcSuites, async (suite) => {
            await this._mergeSuiteResult(suite);
        });
    }

    async _mergeSuiteResult(suite: ISuite) {
        const existentSuite = findNode(this._data.suites, suite.suitePath);

        if (!existentSuite) {
            return await this._addSuiteResult(suite);
        }

        if (suite.children) {
            await Promise.map(suite.children, (childSuite) => this._mergeSuiteResult(childSuite));
        } else {
            await this._mergeBrowserResult(suite);
        }
    }

    async _mergeBrowserResult(suite: ISuite) {
        await Promise.map(suite.browsers || [], async (bro) => {
            const existentBro = this._findBrowserResult(suite.suitePath || '', bro.name);

            if (!existentBro) {
                return await this._addBrowserResult(bro, suite.suitePath || '');
            }

            this._moveTestResultToRetries(existentBro);
            await this._addTestRetries(existentBro, bro.retries);
            await this._changeTestResult(existentBro, bro.result, suite.suitePath || '');
        });
    }

    async _addSuiteResult(suite: ISuite) {
        if (suite.suitePath && suite.suitePath.length === 1) {
            this._data.suites.push(suite);
        } else {
            const existentParentSuite = findNode(this._data.suites, (suite.suitePath || '').slice(0, -1));
            existentParentSuite.children.push(suite);
        }

        this._mergeStatistics(suite);
        // @ts-ignore
        await this._moveImages(suite, {fromFields: ['result', 'retries']});
    }

    async _addBrowserResult(bro: IBrowser, suitePath: string) {
        const existentParentSuite = findNode(this._data.suites, suitePath);
        existentParentSuite.browsers.push(bro);

        this._mergeStatistics(bro);
        // @ts-ignore
        await this._moveImages(bro, {fromFields: ['result', 'retries']});
    }

    _moveTestResultToRetries(existentBro: IBrowser) {
        existentBro.retries.push(existentBro.result);

        this._data.retries += 1;
        const statName = getStatNameForStatus(existentBro.result.status);
        this._data[statName] -= 1;
    }

    async _addTestRetries(existentBro: IBrowser, retries: any) {
        await Promise.mapSeries(retries, (retry) => this._addTestRetry(existentBro, retry));
    }

    async _addTestRetry(existentBro: IBrowser, retry: any) {
        const newAttempt = existentBro.retries.length;

        // @ts-ignore
        await this._moveImages(retry, {newAttempt});
        retry = this._changeFieldsWithAttempt(retry, {newAttempt});

        existentBro.retries.push(retry);
        this._data.retries += 1;
    }

    async _changeTestResult(existentBro: IBrowser, result: ITestResult, suitePath: string) {
        // @ts-ignore
        await this._moveImages(result, {newAttempt: existentBro.retries.length});
        existentBro.result = this._changeFieldsWithAttempt(result, {newAttempt: existentBro.retries.length});

        const statName = getStatNameForStatus(existentBro.result.status);
        this._data[statName] += 1;

        if (!isSkippedStatus(existentBro.result.status)) {
            setStatusForBranch(this._data.suites, suitePath, existentBro.result.status);
        }
    }

    _mergeStatistics(node: INode) {
        const testResultStatuses = getDataFrom(node, {fieldName: 'status', fromFields: 'result'});

        testResultStatuses.forEach((testStatus: string) => {
            const statName = getStatNameForStatus(testStatus);
            if (this._data.hasOwnProperty(statName)) {
                this._data.total += 1;
                this._data[statName] += 1;
            }
        });

        const testRetryStatuses = getDataFrom(node, {fieldName: 'status', fromFields: 'retries'});
        this._data.retries += testRetryStatuses.length;
    }

    async _moveImages(node: INode, {newAttempt, fromFields}: any) {
        await Promise.map(getImagePaths(node, fromFields), async (imgPath: string) => {
            const srcImgPath = path.resolve(this._srcPath, imgPath);
            const destImgPath = path.resolve(
                this._destPath,
                _.isNumber(newAttempt) ? imgPath.replace(/\d+(?=.png$)/, newAttempt as any) : imgPath
            );

            await fs.moveAsync(srcImgPath, destImgPath);
        });
    }

    _changeFieldsWithAttempt(testResult: ITestResult, {newAttempt}: any) {
        const imagesInfo = testResult.imagesInfo && testResult.imagesInfo.map((imageInfo) => {
            return _.mapValues(imageInfo, (val, key) => {
                // @ts-ignore
                return ['expectedPath', 'actualPath', 'diffPath'].includes(key)
                    ? val.replace(/\d+(?=.png)/, newAttempt)
                    : val;
            });
        });

        return _.extend({}, testResult, {attempt: newAttempt, imagesInfo});
    }

    _findBrowserResult(suitePath: string, browserId: string) {
        const existentNode = findNode(this._data.suites, suitePath);
        return _.find(_.get(existentNode, 'browsers'), {name: browserId});
    }
};
