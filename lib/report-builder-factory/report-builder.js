'use strict';

const path = require('path');
const Promise = require('bluebird');
const _ = require('lodash');
const fs = require('fs-extra');
const {IDLE, RUNNING, SUCCESS, FAIL, ERROR, SKIPPED, UPDATED} = require('../constants/test-statuses');
const {getCurrentPath, getReferencePath, getDiffPath, logger} = require('../server-utils');
const {setStatusForBranch} = require('../static/modules/utils');

const NO_STATE = 'NO_STATE';

module.exports = class ReportBuilder {
    static create(toolConfig, pluginConfig, TestAdapter) {
        return new ReportBuilder(toolConfig, pluginConfig, TestAdapter);
    }

    constructor(toolConfig, pluginConfig, TestAdapter) {
        this._tree = {name: 'root'};
        this._skips = [];
        this._toolConfig = toolConfig;
        this._pluginConfig = pluginConfig;
        this._TestAdapter = TestAdapter;
    }

    format(result) {
        return this._TestAdapter.create(result, this._toolConfig);
    }

    addIdle(result, expectedPath = '') {
        return this._addTestResult(this.format(result), {
            status: IDLE,
            expectedPath
        });
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
            reason: comment
        });
    }

    addSuccess(result) {
        return this._addSuccessResult(this.format(result), SUCCESS);
    }

    addUpdated(result) {
        return this._addSuccessResult(this.format(result), UPDATED);
    }

    _addSuccessResult(formattedResult, status) {
        return this._addTestResult(formattedResult, {status});
    }

    addFail(result, props) {
        return this._addFailResult(this.format(result), props);
    }

    _addFailResult(formattedResult, props = {}) {
        return this._addTestResult(formattedResult, _.extend({status: FAIL}, props));
    }

    addError(result, props) {
        return this._addErrorResult(this.format(result), props);
    }

    _addErrorResult(formattedResult, props = {}) {
        return this._addTestResult(formattedResult, _.extend({
            status: ERROR,
            image: !!formattedResult.imagePath || !!formattedResult.currentPath || !!formattedResult.screenshot,
            reason: formattedResult.error
        }, props));
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

    _createTestResult(result, props) {
        const {browserId, suite, sessionId, description} = result;
        const {baseHost} = this._pluginConfig;
        const suiteUrl = suite.getUrl({browserId, baseHost});
        const metaInfo = {url: suite.fullUrl, file: suite.file, sessionId};

        return Object.assign({suiteUrl, name: browserId, metaInfo, description}, props);
    }

    _addTestResult(formattedResult, props) {
        const testResult = this._createTestResult(formattedResult, _.extend(props, {attempt: 0}));
        const {suite, browserId} = formattedResult;

        const suitePath = suite.path.concat(formattedResult.state ? formattedResult.state.name : NO_STATE);
        const node = findOrCreate(this._tree, suitePath, testResult.status);
        node.browsers = Array.isArray(node.browsers) ? node.browsers : [];
        const existing = _.findIndex(node.browsers, {name: browserId});

        if (existing === -1) {
            formattedResult.attempt = testResult.attempt;
            const imagePaths = calcImagePaths(formattedResult, testResult.status);
            node.browsers.push({name: browserId, result: _.extend(testResult, imagePaths), retries: []});
            setStatusForBranch(this._tree, node.suitePath, testResult.status);

            return formattedResult;
        }

        const stateInBrowser = node.browsers[existing];
        const previousResult = stateInBrowser.result;

        const statuses = [SKIPPED, RUNNING, IDLE];

        if (!statuses.includes(previousResult.status)) {
            testResult.attempt = testResult.status === UPDATED
                ? formattedResult.attempt
                : previousResult.attempt + 1;

            if (testResult.status !== UPDATED) {
                stateInBrowser.retries.push(previousResult);
            }
        }

        formattedResult.attempt = testResult.attempt;
        const imagePaths = calcImagePaths(formattedResult, testResult.status);

        stateInBrowser.result = _.extend(testResult, imagePaths);
        setStatusForBranch(this._tree, node.suitePath, testResult.status);

        return formattedResult;
    }

    save() {
        return this.saveDataFileAsync()
            .then(() => this._copyToReportDir(['index.html', 'report.min.js', 'report.min.css']))
            .then(() => this)
            .catch((e) => logger.warn(e.message || e));
    }

    saveDataFileAsync() {
        return fs.mkdirsAsync(this._pluginConfig.path)
            .then(() => this._saveDataFile(fs.writeFileAsync));
    }

    saveDataFileSync() {
        fs.mkdirsSync(this._pluginConfig.path);
        this._saveDataFile(fs.writeFileSync);
    }

    _saveDataFile(saveFn) {
        return saveFn(path.join(this._pluginConfig.path, 'data.js'), this._prepareData(), 'utf8');
    }

    _prepareData() {
        const data = this.getResult();

        return [
            `var data = ${JSON.stringify(data)};`,
            'try { module.exports = data; } catch(e) {}'
        ].join('\n');
    }

    getResult() {
        const {defaultView, baseHost, scaleImages} = this._pluginConfig;

        return _.extend({
            skips: _.uniq(this._skips, JSON.stringify),
            suites: this._tree.children,
            config: {defaultView, baseHost, scaleImages}
        }, this._stats);
    }

    getSuites() {
        return this._tree.children;
    }

    _copyToReportDir(files) {
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

function calcImagePaths(formattedResult, status) {
    if (status === SUCCESS || status === UPDATED) {
        return {expectedPath: getReferencePath(formattedResult)};
    } else if (status === FAIL) {
        return {
            actualPath: getCurrentPath(formattedResult),
            expectedPath: getReferencePath(formattedResult),
            diffPath: getDiffPath(formattedResult)
        };
    } else if (status === ERROR) {
        return {actualPath: formattedResult.state ? getCurrentPath(formattedResult) : ''};
    }
}
