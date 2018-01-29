'use strict';

const path = require('path');
const Promise = require('bluebird');
const _ = require('lodash');
const fs = require('fs-extra');
const utils = require('../../utils');
const {logger} = require('../../utils');
const testStatuses = require('../constants/test-statuses');

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
            status: testStatuses.IDLE
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
            skipped: true, // оставить для обратной совместимости
            status: testStatuses.SKIPPED,
            reason: comment
        });
    }

    addSuccess(result) {
        const formattedResult = this.format(result);
        this._addTestResult(result, {
            success: true,
            status: testStatuses.SUCCESS,
            actualPath: utils.getCurrentPath(formattedResult),
            expectedPath: utils.getReferencePath(formattedResult)
        });
    }

    addFail(result) {
        this._addFailResult(result);
    }

    _addFailResult(result) {
        const formattedResult = this.format(result);
        this._addTestResult(result, {
            fail: true,
            status: testStatuses.FAIL,
            actualPath: utils.getCurrentPath(formattedResult),
            expectedPath: utils.getReferencePath(formattedResult),
            diffPath: utils.getDiffPath(formattedResult)
        });
    }

    addError(result) {
        this._addErrorResult(result);
    }

    _addErrorResult(result) {
        const formattedResult = this.format(result);
        this._addTestResult(result, {
            actualPath: formattedResult.state ? utils.getCurrentPath(formattedResult) : '',
            error: true,
            status: testStatuses.ERROR,
            image: !!formattedResult.imagePath || !!formattedResult.currentPath || !!formattedResult.screenshot,
            reason: formattedResult.error
        });
    }

    addRetry(result) {
        const formattedResult = this.format(result);

        if (formattedResult.isEqual()) {
            this._addFailResult(result);
        } else {
            this._addErrorResult(result);
        }
    }

    setStats(stats) {
        this._stats = stats;

        return this;
    }

    _createTestResult(result, status) {
        result = this.format(result);
        const {browserId, suite, sessionId} = result;
        const {baseHost} = this._pluginConfig;
        const suiteUrl = suite.getUrl({browserId, baseHost});
        const metaInfo = {url: suite.fullUrl, file: suite.file, sessionId};

        return Object.assign({suiteUrl, name: browserId, metaInfo, status});
    }

    _addTestResult(result, props) {
        const testResult = _.assign(this._createTestResult(result), props);
        const {browserId, suite} = this.format(result);
        const {status} = props;

        const suitePath = suite.path.concat(result.state ? result.state.name : NO_STATE);
        const node = findOrCreate(this._tree, suitePath, status);
        node.browsers = Array.isArray(node.browsers) ? node.browsers : [];
        node.status = status;

        const existing = _.findIndex(node.browsers, {name: browserId});

        if (existing === -1) {
            node.browsers.push({name: browserId, result: testResult, retries: []});

            return;
        }

        const stateInBrowser = node.browsers[existing];
        const previousResult = stateInBrowser.result;

        const statuses = [testStatuses.SKIPPED, testStatuses.RUNNING, testStatuses.IDLE];
        if (!statuses.includes(previousResult.status)) {
            stateInBrowser.retries.push(previousResult);
        }

        stateInBrowser.result = testResult;
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

function findOrCreate(node, statePath, status) {
    if (statePath.length === 0) {
        return node;
    }

    node.status = status;
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

    return findOrCreate(child, statePath, status);
}
