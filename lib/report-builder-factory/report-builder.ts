import path from 'path';
import Promise from 'bluebird';
import _ from 'lodash';

import { ITestTool, ITestResult } from 'typings/test-adapter';
import { ISuite } from 'typings/suite-adapter';
import { IPluginConfig } from 'typings/pluginConfig';
import { TestAdapterType } from 'typings/test-adapter';

const fs = require('fs-extra');
const {IDLE, RUNNING, SUCCESS, FAIL, ERROR, SKIPPED, UPDATED} = require('../constants/test-statuses');
const {logger, getPathsFor, hasImage, prepareCommonJSData} = require('../server-utils');
const {setStatusForBranch, hasFails, hasNoRefImageErrors} = require('../static/modules/utils');

const NO_STATE = 'NO_STATE';

interface ISkip {
    suite: ISuite;
    browser: string;
    comment: string;
}

module.exports = class ReportBuilder {
    protected _tree: {
        name?: string;
        children?: ISuite;
    };

    protected _skips: ISkip[];
    protected _stats: any;

    static create(tool: ITestTool, pluginConfig: IPluginConfig, TestAdapter: TestAdapterType) {
        return new ReportBuilder(tool, pluginConfig, TestAdapter);
    }

    constructor(
        protected _tool: ITestTool,
        protected _pluginConfig: IPluginConfig,
        protected _TestAdapter: TestAdapterType
    ) {
        this._tree = {name: 'root'};
        this._skips = [];
    }

    format(result: ITestResult) {
        return this._TestAdapter.create(result, this._tool);
    }

    addIdle(result: ITestResult) {
        return this._addTestResult(this.format(result), {status: IDLE});
    }

    addSkipped(result: ITestResult) {
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
            reason: comment
        });
    }

    addSuccess(result: ITestResult) {
        return this._addSuccessResult(this.format(result), SUCCESS);
    }

    addUpdated(result: ITestResult) {
        const formattedResult = this.format(result);

        formattedResult.imagesInfo = (result.imagesInfo || []).map((imageInfo) => {
            const {stateName} = imageInfo;
            return _.extend(imageInfo, getPathsFor(UPDATED, formattedResult, stateName));
        });

        return this._addSuccessResult(formattedResult, UPDATED);
    }

    _addSuccessResult(formattedResult: ITestResult, status: string) {
        return this._addTestResult(formattedResult, {status});
    }

    addFail(result: ITestResult) {
        return this._addFailResult(this.format(result));
    }

    _addFailResult(formattedResult: ITestResult) {
        return this._addTestResult(formattedResult, {status: FAIL});
    }

    addError(result: ITestResult) {
        return this._addErrorResult(this.format(result));
    }

    _addErrorResult(formattedResult: ITestResult) {
        return this._addTestResult(formattedResult, {
            status: ERROR,
            reason: formattedResult.error
        });
    }

    addRetry(result: ITestResult) {
        const formattedResult = this.format(result);

        if (formattedResult.hasDiff()) {
            return this._addFailResult(formattedResult);
        } else {
            return this._addErrorResult(formattedResult);
        }
    }

    setStats(stats: any) {
        this._stats = stats;

        return this;
    }

    _createTestResult(result: ITestResult, props: any) {
        const {browserId = '', suite = {}, sessionId, description, imagesInfo, screenshot, multipleTabs} = result;

        const {baseHost} = this._pluginConfig;
        const suiteUrl = suite.getUrl && suite.getUrl({browserId, baseHost});
        const metaInfo = _.merge(result.meta, {url: suite.fullUrl, file: suite.file, sessionId});

        return Object.assign({
            suiteUrl, name: browserId, metaInfo, description, imagesInfo,
            screenshot: Boolean(screenshot), multipleTabs
        }, props);
    }

    _addTestResult(formattedResult: ITestResult, props: any) {
        const testResult = this._createTestResult(formattedResult, _.extend(props, {attempt: 0}));
        const {suite = {}, browserId} = formattedResult;

        const suitePath = suite.path && suite.path.concat(formattedResult.state ? formattedResult.state.name : NO_STATE);
        // @ts-ignore
        const node = findOrCreate(this._tree, suitePath, testResult.status);
        node.browsers = Array.isArray(node.browsers) ? node.browsers : [];
        const existing = _.findIndex(node.browsers, {name: browserId});

        if (existing === -1) {
            formattedResult.attempt = testResult.attempt;
            formattedResult.image = hasImage(formattedResult);
            extendTestWithImagePaths(testResult, formattedResult);

            if (hasNoRefImageErrors(formattedResult)) {
                testResult.status = FAIL;
            }

            node.browsers.push({name: browserId, result: testResult, retries: []});
            setStatusForBranch(this._tree, node.suitePath, testResult.status);

            return formattedResult;
        }

        const stateInBrowser = node.browsers[existing];
        const previousResult = _.cloneDeep(stateInBrowser.result);

        const statuses = [SKIPPED, RUNNING, IDLE];

        // @ts-ignore
        if (!statuses.includes(previousResult.status)) {
            testResult.attempt = testResult.status === UPDATED
                ? formattedResult.attempt
                : previousResult.attempt + 1;

            if (testResult.status !== UPDATED) {
                stateInBrowser.retries.push(previousResult);
            }
        }

        formattedResult.attempt = testResult.attempt;
        formattedResult.image = hasImage(formattedResult);

        const {imagesInfo, status: currentStatus} = stateInBrowser.result;
        stateInBrowser.result = extendTestWithImagePaths(testResult, formattedResult, imagesInfo);

        if (!hasFails(stateInBrowser)) {
            stateInBrowser.result.status = SUCCESS;
        } else if (hasNoRefImageErrors(stateInBrowser.result)) {
            stateInBrowser.result.status = FAIL;
        } else if (stateInBrowser.result.status === UPDATED) {
            stateInBrowser.result.status = currentStatus;
        }

        setStatusForBranch(this._tree, node.suitePath, testResult.status);

        return formattedResult;
    }

    save() {
        return this.saveDataFileAsync()
            .then(() => this._copyToReportDir(['index.html', 'report.min.js', 'report.min.css']))
            .then(() => this)
            .catch((e: Error) => logger.warn(e.message || e));
    }

    saveDataFileAsync() {
        return fs.mkdirsAsync(this._pluginConfig.path)
            .then(() => this._saveDataFile(fs.writeFileAsync));
    }

    saveDataFileSync() {
        fs.mkdirsSync(this._pluginConfig.path);
        this._saveDataFile(fs.writeFileSync);
    }

    _saveDataFile(saveFn: (path: string, result: ITestResult, encode: string) => string): string {
        return saveFn(
            path.join(this._pluginConfig.path, 'data.js'),
            prepareCommonJSData(this.getResult()),
            'utf8'
        );
    }

    getResult() {
        const {defaultView, baseHost, scaleImages, lazyLoadOffset} = this._pluginConfig;

        return _.extend({
            // @ts-ignore
            skips: _.uniq(this._skips, JSON.stringify),
            suites: this._tree.children,
            config: {defaultView, baseHost, scaleImages, lazyLoadOffset}
        }, this._stats);
    }

    getSuites() {
        return this._tree.children;
    }

    _copyToReportDir(files: string[]) {
        return Promise.map(files, (fileName) => {
            const from = path.resolve(__dirname, '../static', fileName);
            const to = path.join(this._pluginConfig.path, fileName);

            return fs.copyAsync(from, to);
        });
    }

    get reportPath() {
        return path.resolve(`${this._pluginConfig.path}/index.html`);
    }
};

function findOrCreate(node: any, statePath: string[]): any {
    if (statePath.length === 0) {
        return node;
    }

    node.children = Array.isArray(node.children) ? node.children : [];

    const pathPart = statePath.shift();
    node.suitePath = node.suitePath || [];

    if (pathPart === NO_STATE) {
        return node;
    }

    let child: any = _.find(node.children, {name: pathPart});

    if (!child) {
        child = {
            name: pathPart,
            suitePath: node.suitePath.concat(pathPart)
        };
        node.children.push(child);
    }

    return findOrCreate(child, statePath);
}

function extendTestWithImagePaths(test: ITestResult, formattedResult: ITestResult, oldImagesInfo: any[] = []) {
    const newImagesInfo = formattedResult.getImagesInfo && formattedResult.getImagesInfo(test.status || '');

    if (test.status !== UPDATED) {
        return _.set(test, 'imagesInfo', newImagesInfo);
    }

    if (oldImagesInfo.length) {
        test.imagesInfo = oldImagesInfo;
        newImagesInfo.forEach((imageInfo: any) => {
            const {stateName} = imageInfo;
            const index = _.findIndex(test.imagesInfo, {stateName});

            test.imagesInfo ? test.imagesInfo[index >= 0 ? index : _.findLastIndex(test.imagesInfo)] = imageInfo : null;
        });
    }

    return test;
}
