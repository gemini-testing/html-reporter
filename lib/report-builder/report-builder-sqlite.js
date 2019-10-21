'use strict';

const path = require('path');
const _ = require('lodash');

const {IDLE, RUNNING, FAIL, SKIPPED, UPDATED, SUCCESS} = require('../constants/test-statuses');
const {hasImage, shouldUpdateAttempt, saveStaticFilesToReportDir} = require('../server-utils');
const {setStatusForBranch, hasNoRefImageErrors, hasFails, allSkipped} = require('../static/modules/utils');
const TestAdapter = require('../test-adapter');
const SqliteAdapter = require('../sqlite-adapter');
const ReportBuilder = require('./report-builder');

const NO_STATE = 'NO_STATE';

module.exports = class ReportBuilderSqlite extends ReportBuilder {
    static async create(hermione, pluginConfig) {
        const reportBuilder = new ReportBuilderSqlite(hermione, pluginConfig);
        await Promise.all([saveStaticFilesToReportDir(hermione, pluginConfig, pluginConfig.path), reportBuilder.initSqliteConnection(pluginConfig.path)]);

        return reportBuilder;
    }

    constructor(hermione, pluginConfig, TestAdapter) {
        super(hermione, pluginConfig, TestAdapter);

        this._tree = {name: 'root'};
        this._apiValues = {};
        this._sqlite = null;
    }

    async initSqliteConnection(savePath) {
        this._sqlite = await SqliteAdapter.create(savePath);
    }

    format(result, status) {
        return result instanceof TestAdapter
            ? result
            : TestAdapter.create(result, this._hermione, status);
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

    _addTestResult(formattedResult, props) {
        const testResult = this._createTestResult(formattedResult, _.extend(props, {attempt: formattedResult.attempt}));
        const node = this._getResultNode(formattedResult);
        const stateInBrowser = this._getStateInBrowser(node, formattedResult);
        const notSavedStatuses = [SKIPPED, RUNNING, IDLE];

        if (!stateInBrowser) {
            this._initNode(node, formattedResult, testResult);
            formattedResult.image = hasImage(formattedResult);
            if (!notSavedStatuses.includes(testResult.status)) {
                this._writeTestResultToDb(testResult, formattedResult);
            }

            return formattedResult;
        }
        this._updateNode({node, stateInBrowser, formattedResult, testResult});

        if (!notSavedStatuses.includes(testResult.status)) {
            this._writeTestResultToDb(testResult, formattedResult);
        }

        return formattedResult;
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
        const statuses = [SKIPPED, RUNNING, IDLE];

        return !statuses.includes(previousResult.status) && testResult.status !== UPDATED;
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

    _writeTestResultToDb(testResult, formattedResult) {
        const {suite} = formattedResult;
        const suitePath = suite.path.concat(formattedResult.state ? formattedResult.state.name : NO_STATE);
        const suiteName = formattedResult.state ? formattedResult.state.name : NO_STATE;
        this._sqlite.write({testResult, suitePath, suiteName});
    }

    saveReusedTestResult(testResult) {
        this._sqlite.saveReusedTestResult(testResult);
    }
    save() {
        // this._sqlite.close();
        return new Promise(resolve => {
            resolve(1);
        });
    }

    getResult() {
        const {defaultView, baseHost, scaleImages, lazyLoadOffset, errorPatterns, metaInfoBaseUrls} = this._pluginConfig;

        this._sortTree();
        return _.extend({
            skips: _.uniq(this._skips, JSON.stringify),
            suites: this._tree.children,
            config: {defaultView, baseHost, scaleImages, lazyLoadOffset, errorPatterns, metaInfoBaseUrls},
            apiValues: this._apiValues,
            date: new Date().toString(),
            saveFormat: 'sqlite'
        }, this._stats);
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

    get reportPath() {
        return path.resolve(`${this._pluginConfig.path}/index.html`);
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

