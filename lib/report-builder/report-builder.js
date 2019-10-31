'use strict';

const _ = require('lodash');

const {IDLE, RUNNING, SUCCESS, FAIL, ERROR, SKIPPED, UPDATED} = require('../constants/test-statuses');
const {hasImage, shouldUpdateAttempt} = require('../server-utils');
const {setStatusForBranch, hasNoRefImageErrors, hasFails, allSkipped} = require('../static/modules/utils');

const NO_STATE = 'NO_STATE';
const statusesToSkip = [SKIPPED, RUNNING, IDLE];

module.exports = class ReportBuilder {
    static create(hermione, pluginConfig) {
        return new ReportBuilder(hermione, pluginConfig);
    }

    constructor(hermione, pluginConfig) {
        this._tree = {name: 'root'};
        this._skips = [];
        this._hermione = hermione;
        this._apiValues = {};
        this._pluginConfig = pluginConfig;
    }

    _getResultNode(formattedResult) {
        const {suite} = formattedResult;
        const suitePath = suite.path.concat(formattedResult.state ? formattedResult.state.name : NO_STATE);
        const node = findOrCreate(this._tree, suitePath);
        node.browsers = Array.isArray(node.browsers) ? node.browsers : [];

        return node;
    }

    _getStateInBrowser(node, formattedResult) {
        const index = _.findIndex(node.browsers, {name: formattedResult.browserId});
        return node.browsers[index];
    }

    _getPreviousResult({formattedResult, stateInBrowser}) {
        if (!stateInBrowser) {
            const node = this._getResultNode(formattedResult);
            stateInBrowser = this._getStateInBrowser(node, formattedResult);
        }

        return _.cloneDeep(stateInBrowser.result);
    }

    getCurrAttempt(formattedResult) {
        const previousResult = this._getPreviousResult({formattedResult});

        return shouldUpdateAttempt(previousResult.status) ? previousResult.attempt + 1 : previousResult.attempt;
    }

    _initNode(node, formattedResult, testResult) {
        const {browserId} = formattedResult;
        this._extendTestWithImagePaths(testResult, formattedResult);

        if (hasNoRefImageErrors(formattedResult)) {
            testResult.status = FAIL;
        }

        node.browsers.push({name: browserId, result: testResult, retries: []});
        setStatusForBranch(this._tree, node.suitePath);
    }

    _updateNode({node, stateInBrowser, formattedResult, testResult}) {
        const previousResult = this._getPreviousResult({formattedResult, stateInBrowser});
        const {imagesInfo} = stateInBrowser.result;
        const newResult = this._extendTestWithImagePaths(testResult, formattedResult, imagesInfo);
        const shouldUpdateResult = this._shouldUpdateResult(formattedResult, previousResult);
        const shouldAddRetry = this._shouldAddRetry(testResult, previousResult);

        if (shouldAddRetry && !shouldUpdateResult) {
            stateInBrowser.retries[formattedResult.attempt] = newResult;
        }

        if (shouldUpdateResult) {
            if (shouldAddRetry) {
                stateInBrowser.retries[previousResult.attempt] = previousResult;
            }
            formattedResult.image = hasImage(formattedResult);

            const {status: currentStatus} = stateInBrowser.result;
            stateInBrowser.result = newResult;

            this._setResultStatus(stateInBrowser, currentStatus);
        }

        setStatusForBranch(this._tree, node.suitePath);
    }

    _shouldAddRetry(testResult, previousResult) {
        return !statusesToSkip.includes(previousResult.status) && testResult.status !== UPDATED;
    }

    _shouldUpdateResult(formattedResult, previousResult) {
        return formattedResult.attempt >= previousResult.attempt;
    }

    _setResultStatus(stateInBrowser, currentStatus) {
        if (!hasFails(stateInBrowser) && !allSkipped(stateInBrowser)) {
            stateInBrowser.result.status = SUCCESS;
        } else if (hasNoRefImageErrors(stateInBrowser.result)) {
            stateInBrowser.result.status = FAIL;
        } else if (stateInBrowser.result.status === UPDATED) {
            stateInBrowser.result.status = currentStatus;
        }
    }

    _sortTree(node = this._tree) {
        if (node.children) {
            node.children = _.sortBy(node.children, 'name');
            node.children.forEach((node) => this._sortTree(node));
        }
    }

    getSuites() {
        return this._tree.children;
    }

    async addIdle(result) {
        return await this._addTestResult(this.format(result, IDLE), {status: IDLE});
    }

    async addSkipped(result) {
        const formattedResult = this.format(result);

        const {
            suite: {
                skipComment: comment,
                fullName: suite
            },
            browserId: browser
        } = formattedResult;

        this._skips.push({suite, browser, comment});

        return await this._addTestResult(formattedResult, {
            status: SKIPPED,
            skipReason: comment
        });
    }

    async addSuccess(result) {
        return await this._addSuccessResult(this.format(result), SUCCESS);
    }

    async addUpdated(result) {
        const formattedResult = this.format(result, UPDATED);

        formattedResult.imagesInfo = (result.imagesInfo || []).map((imageInfo) => {
            const {stateName} = imageInfo;

            return _.extend(imageInfo, formattedResult.getImagesFor(UPDATED, stateName));
        });

        return await this._addSuccessResult(formattedResult, UPDATED);
    }

    async _addSuccessResult(formattedResult, status) {
        return await this._addTestResult(formattedResult, {status});
    }

    async addFail(result) {
        return await this._addFailResult(this.format(result));
    }

    async _addFailResult(formattedResult) {
        return await this._addTestResult(formattedResult, {status: FAIL});
    }

    async addError(result) {
        return await this._addErrorResult(this.format(result));
    }

    async _addErrorResult(formattedResult) {
        return await this._addTestResult(formattedResult, {
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

function findOrCreate(node, statePath) {
    if (statePath.length === 0) {
        return node;
    }

    node.children = Array.isArray(node.children) ? node.children : [];

    const pathPart = statePath.shift();
    node.suitePath = node.suitePath || [];

    if (pathPart === NO_STATE) {
        return node;
    }

    let child = _.find(node.children, {name: pathPart});

    if (!child) {
        child = {
            name: pathPart,
            suitePath: node.suitePath.concat(pathPart)
        };
        node.children.push(child);
    }

    return findOrCreate(child, statePath);
}
