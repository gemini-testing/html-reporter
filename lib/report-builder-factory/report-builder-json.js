'use strict';

const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');

const {IDLE, RUNNING, FAIL, SKIPPED, UPDATED, SUCCESS} = require('../constants/test-statuses');
const {hasImage, logError, prepareCommonJSData, shouldUpdateAttempt} = require('../server-utils');
const {setStatusForBranch, hasNoRefImageErrors, hasFails, allSkipped} = require('../static/modules/utils');
const TestAdapter = require('../test-adapter');
const ReportBuilder = require('./report-builder');

const NO_STATE = 'NO_STATE';

module.exports = class ReportBuilderJson extends ReportBuilder {
    static create(hermione, pluginConfig) {
        return new ReportBuilderJson(hermione, pluginConfig);
    }

    constructor(hermione, pluginConfig, TestAdapter) {
        super(hermione, pluginConfig, TestAdapter);

        this._tree = {name: 'root'};
        this._apiValues = {};
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

        if (!stateInBrowser) {
            this._initNode(node, formattedResult, testResult);
            formattedResult.image = hasImage(formattedResult);
            return formattedResult;
        }

        this._updateNode({node, stateInBrowser, formattedResult, testResult});
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

    save() {
        return this.saveDataFileAsync()
            .then(() => this._copyToReportDir(['index.html', 'report.min.js', 'report.min.css']))
            .then(() => this)
            .catch(logError);
    }

    saveDataFileAsync() {
        return fs.mkdirs(this._pluginConfig.path)
            .then(() => this._saveDataFile(fs.writeFile));
    }

    saveDataFileSync() {
        fs.mkdirsSync(this._pluginConfig.path);
        this._saveDataFile(fs.writeFileSync);
    }

    _saveDataFile(saveFn) {
        // if we're saving data to a sqlite.db, the 'old' data file with be saved as dataJSON.js, in order for
        // user to still be able to access it. Will be deleted when we get rid of saving to JSON object

        const fileName = this._pluginConfig.saveFormat === 'sqlite' ? 'dataJSON.js' : 'data.js';
        return saveFn(
            path.join(this._pluginConfig.path, fileName),
            prepareCommonJSData(this.getResult()),
            'utf8'
        );
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
            saveFormat: 'js'
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

