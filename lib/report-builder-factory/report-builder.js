'use strict';

const path = require('path');
const Promise = require('bluebird');
const _ = require('lodash');
const fs = require('fs-extra');
const utils = require('../../utils');
const {logger} = require('../../utils');

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

    addSkipped(result) {
        result = this.format(result);
        const comment = result.suite.skipComment;

        this._skips.push({suite: result.suite.fullName, browser: result.browserId, comment});

        this._addTestResult(result, {
            skipped: true,
            reason: comment
        });
    }

    addSuccess(result) {
        result = this.format(result);
        this._addTestResult(result, {
            success: true,
            actualPath: utils.getCurrentPath(result),
            expectedPath: utils.getReferencePath(result)
        });
    }

    addFail(result) {
        result = this.format(result);
        this._addFailResult(result);
    }

    _addFailResult(result) {
        this._addTestResult(result, {
            fail: true,
            actualPath: utils.getCurrentPath(result),
            expectedPath: utils.getReferencePath(result),
            diffPath: utils.getDiffPath(result)
        });
    }

    addError(result) {
        result = this.format(result);
        this._addErrorResult(result);
    }

    _addErrorResult(result) {
        this._addTestResult(result, {
            actualPath: result.state ? utils.getCurrentPath(result) : '',
            error: true,
            image: !!result.imagePath || !!result.currentPath || !!result.screenshot,
            reason: result.error
        });
    }

    addRetry(result) {
        result = this.format(result);

        if (result.isEqual()) {
            this._addFailResult(result);
        } else {
            this._addErrorResult(result);
        }
    }

    setStats(stats) {
        this._stats = stats;

        return this;
    }

    _addTestResult(result, props) {
        const {browserId, suite, sessionId} = result;
        const {baseHost} = this._pluginConfig;
        const suiteUrl = suite.getUrl({browserId, baseHost});

        const metaInfo = {url: suite.fullUrl, file: suite.file, sessionId};
        const testResult = _.assign({suiteUrl, name: browserId, metaInfo}, props);

        const node = findOrCreate(this._tree, suite.path.concat(result.state ? result.state.name : NO_STATE));
        node.browsers = Array.isArray(node.browsers) ? node.browsers : [];

        const existing = _.findIndex(node.browsers, {name: browserId});

        if (existing === -1) {
            node.browsers.push({name: browserId, result: testResult, retries: []});

            return;
        }

        const stateInBrowser = node.browsers[existing];
        const previousResult = stateInBrowser.result;

        if (!previousResult.skipped) {
            stateInBrowser.retries.push(previousResult);
        }

        stateInBrowser.result = testResult;
    }

    save() {
        const reportDir = this._pluginConfig.path;

        return fs.mkdirsAsync(reportDir)
            .then(() => Promise.all([
                fs.writeFileAsync(path.join(reportDir, 'data.js'), this._prepareData(), 'utf8'),
                this._copyToReportDir(['index.html', 'bundle.min.js', 'bundle.min.css'])
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
