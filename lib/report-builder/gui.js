'use strict';

const _ = require('lodash');
const StaticReportBuilder = require('./static');
const {IDLE, RUNNING, SUCCESS, FAIL, SKIPPED, UPDATED} = require('../constants/test-statuses');
const {setStatusForBranch, hasNoRefImageErrors, hasFails, allSkipped} = require('../static/modules/utils');
const {shouldUpdateAttempt} = require('../server-utils');

const statusesToSkip = [SKIPPED, RUNNING, IDLE];

module.exports = class GuiReportBuilder extends StaticReportBuilder {
    static create(...args) {
        return new this(...args);
    }

    constructor(...args) {
        super(...args);

        this._tree = {name: 'root'};
        this._skips = [];
        this._apiValues = {};
    }

    addIdle(result) {
        return this._addTestResult(this.format(result, IDLE), {status: IDLE});
    }

    addSkipped(result) {
        const formattedResult = super.addSkipped(result);
        const {
            suite: {
                skipComment: comment,
                fullName: suite
            },
            browserId: browser
        } = formattedResult;

        this._skips.push({suite, browser, comment});
    }

    addUpdated(result) {
        const formattedResult = this.format(result, UPDATED);

        formattedResult.imagesInfo = []
            .concat(result.imagesInfo)
            .map((imageInfo) => ({...imageInfo, ...formattedResult.getImagesFor(UPDATED, imageInfo.stateName)}));

        return this._addTestResult(formattedResult, {status: UPDATED});
    }

    setApiValues(values) {
        this._apiValues = values;

        return this;
    }

    getResult() {
        const {
            defaultView, baseHost, scaleImages, lazyLoadOffset,
            errorPatterns, metaInfoBaseUrls, customGui, customScripts
        } = this._pluginConfig;

        this._sortTree();

        return {
            skips: this._skips,
            suites: this._tree.children,
            config: {
                defaultView, baseHost, scaleImages, lazyLoadOffset,
                errorPatterns, metaInfoBaseUrls, customGui, customScripts
            },
            date: new Date().toString(),
            apiValues: this._apiValues
        };
    }

    getSuites() {
        return this._tree.children;
    }

    getCurrAttempt(formattedResult) {
        const previousResult = this._getPreviousResult({formattedResult});

        return shouldUpdateAttempt(previousResult.status) ? previousResult.attempt + 1 : previousResult.attempt;
    }

    _getPreviousResult({formattedResult, stateInBrowser}) {
        if (!stateInBrowser) {
            const node = this._getResultNode(formattedResult);
            stateInBrowser = this._getStateInBrowser(node, formattedResult);
        }

        return _.cloneDeep(stateInBrowser.result);
    }

    _addTestResult(formattedResult, props) {
        super._addTestResult(formattedResult, props);

        const testResult = this._createTestResult(formattedResult, {...props, attempt: formattedResult.attempt});
        const node = this._getResultNode(formattedResult);
        const stateInBrowser = this._getStateInBrowser(node, formattedResult);

        if (!stateInBrowser) {
            this._initNode(node, formattedResult, testResult);
        } else {
            this._updateNode({node, stateInBrowser, formattedResult, testResult});
        }

        return formattedResult;
    }

    _getResultNode(formattedResult) {
        const {suite} = formattedResult;
        const suitePath = suite.path.concat(formattedResult.state.name);
        const node = findOrCreate(this._tree, suitePath);

        node.browsers = Array.isArray(node.browsers) ? node.browsers : [];

        return node;
    }

    _getStateInBrowser(node, formattedResult) {
        const index = _.findIndex(node.browsers, {name: formattedResult.browserId});
        return node.browsers[index];
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

    _sortTree(node = this._tree) {
        if (node.children) {
            node.children = _.sortBy(node.children, 'name');
            node.children.forEach((node) => this._sortTree(node));
        }
    }
};

function findOrCreate(node, statePath) {
    if (statePath.length === 0) {
        return node;
    }

    node.children = Array.isArray(node.children) ? node.children : [];

    const pathPart = statePath.shift();
    node.suitePath = node.suitePath || [];

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
