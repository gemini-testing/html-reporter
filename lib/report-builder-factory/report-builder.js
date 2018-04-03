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

    addIdle(result) {
        this._addTestResult(result, {
            status: IDLE
        });
    }

    addSkipped(result) {
        const {
            suite: {
                skipComment: comment,
                fullName: suite
            },
            browserId: browser
        } = this.format(result);

        this._skips.push({suite, browser, comment});

        this._addTestResult(result, {
            status: SKIPPED,
            reason: comment
        });
    }

    addSuccess(result) {
        console.log('ADD SUCCESS');
        this._addSuccessResult(result, SUCCESS);
    }

    addUpdated(result) {
        this._addSuccessResult(result, UPDATED);
    }

    _addSuccessResult(result, status) {
        this._addTestResult(result, {status}, {expectedPath: getReferencePath});
    }

    addFail(result, props) {
        console.log('ADD FAIL');
        this._addFailResult(result, props);
    }

    _addFailResult(result, props = {}) {
        const paths = {
            actualPath: getCurrentPath,
            expectedPath: getReferencePath,
            diffPath: getDiffPath
        };

        this._addTestResult(result, _.extend({status: FAIL}, props), paths);
    }

    addError(result, props) {
        console.log('ADD ERROR');
        this._addErrorResult(result, props);
    }

    _addErrorResult(result, props = {}) {
        const formattedResult = this.format(result);
        props = _.extend({
            status: ERROR,
            image: !!formattedResult.imagePath || !!formattedResult.currentPath || !!formattedResult.screenshot,
            reason: formattedResult.error
        }, props);
        const paths = {
            actualPath: (formattedResult) => formattedResult.state ? getCurrentPath(formattedResult) : ''
        };

        this._addTestResult(result, props, paths);
    }

    addRetry(result) {
        console.log('ADD RETRY');
        const formattedResult = this.format(result);

        if (formattedResult.hasDiff()) {
            this._addFailResult(result);
        } else {
            this._addErrorResult(result);
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

    _addTestResult(result, props, paths) {
        const formattedResult = this.format(result);
        const testResult = this._createTestResult(formattedResult, props);
        const {browserId, suite} = formattedResult;
        const {status} = props;

        const suitePath = suite.path.concat(formattedResult.state ? formattedResult.state.name : NO_STATE);
        const node = findOrCreate(this._tree, suitePath, status);
        node.browsers = Array.isArray(node.browsers) ? node.browsers : [];
        const existing = _.findIndex(node.browsers, {name: browserId});

        if (existing === -1) {
            testResult.attempt = 0;
            if (paths) {
                this._extendTestResultWithPaths(testResult, result, paths);
            }

            node.browsers.push({name: browserId, result: testResult, retries: []});
            setStatusForBranch(this._tree, node.suitePath, status);

            return;
        }

        const stateInBrowser = node.browsers[existing];
        const previousResult = stateInBrowser.result;

        const statuses = [SKIPPED, RUNNING, IDLE];

        if (!statuses.includes(previousResult.status) && testResult.status !== UPDATED) {
            stateInBrowser.retries.push(previousResult);
            testResult.attempt = previousResult.attempt + 1;
        } else {
            testResult.attempt = result.attempt;
        }

        if (paths) {
            this._extendTestResultWithPaths(testResult, result, paths);
        }

        stateInBrowser.result = testResult;
        setStatusForBranch(this._tree, node.suitePath, status);
    }

    _extendTestResultWithPaths(testResult, result, paths) {
        const {attempt} = testResult;
        const formattedResult = this.format(_.defaults({attempt}, result));

        _.forEach(paths, (func, path) => {
            testResult[path] = func(formattedResult);
        });
    }

    save() {
        const reportDir = this._pluginConfig.path;

        return fs.mkdirsAsync(reportDir)
            .then(() => Promise.all([
                fs.writeFileAsync(path.join(reportDir, 'data.js'), this._prepareData(), 'utf8'),
                this._copyToReportDir(['index.html', 'report.min.js', 'report.min.css'])
            ]))
            .then(() => this)
            .catch((e) => logger.warn(e.message || e));
    }

    _prepareData() {
        const data = this.getResult();

        return [
            `var data = ${JSON.stringify(data)};`,
            'try { module.exports = data; } catch(e) {}'
        ].join('\n');
    }

    getResult() {
        const {defaultView, baseHost} = this._pluginConfig;

        return _.extend({
            skips: _.uniq(this._skips, JSON.stringify),
            suites: this._tree.children,
            config: {defaultView, baseHost}
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
