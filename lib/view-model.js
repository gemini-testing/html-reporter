'use strict';

const _ = require('lodash');
const Uri = require('urijs');
const utils = require('../utils');

const NO_STATE = 'NO_STATE';

module.exports = class ViewModel {
    constructor(toolConfig, pluginConfig) {
        this._tree = {name: 'root'};
        this._skips = [];
        this._toolConfig = toolConfig;
        this._pluginConfig = pluginConfig;
    }

    /**
     * @param {StateResult} result
     */
    addSkipped(result) {
        const comment = result.suite.skipComment && wrapLinkByTag(result.suite.skipComment);

        this._skips.push({suite: result.suite.fullName, browser: result.browserId, comment});

        this._addTestResult(result, {
            skipped: true,
            reason: comment
        });
    }

    /**
     * @param {TestStateResult} result
     */
    addSuccess(result) {
        this._addTestResult(result, {
            success: true,
            actualPath: utils.getCurrentPath(result),
            expectedPath: utils.getReferencePath(result)
        });
    }

    /**
     * @param {TestStateResult} result
     */
    addFail(result) {
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

    /**
     * @param {ErrorStateResult} result
     */
    addError(result) {
        this._addErrorResult(result);
    }

    _addErrorResult(result) {
        this._addTestResult(result, {
            actualPath: result.state ? utils.getCurrentPath(result) : '',
            error: true,
            image: !!result.imagePath || !!result.currentPath,
            reason: (result.stack || result.message || result || '')
        });
    }

    /**
     * @param {ErrorStateResult|TestStateResult} result
     */
    addRetry(result) {
        if (result.hasOwnProperty('equal')) {
            this._addFailResult(result);
        } else {
            this._addErrorResult(result);
        }
    }

    /**
     * @returns {ViewModelResult}
     */
    getResult(stats) {
        const {defaultView, baseHost} = this._pluginConfig;

        return _.extend({
            skips: _.uniq(this._skips, JSON.stringify),
            suites: this._tree.children,
            config: {defaultView, baseHost}
        }, stats);
    }

    _addTestResult(result, props) {
        const browserId = result.browserId;
        const suite = result.suite;
        const browserConfig = this._toolConfig.forBrowser(browserId);
        const suiteUrl = browserConfig.getAbsoluteUrl(suite.url);
        const metaInfo = {
            url: suite.fullUrl,
            file: suite.file,
            sessionId: result.sessionId || 'unknown session id'
        };

        const testResult = _.assign({
            suiteUrl: this._configureSuiteUrl(suiteUrl),
            name: browserId,
            metaInfo: JSON.stringify(metaInfo, null, 4) || 'Meta info is not available'
        }, props);

        const node = findOrCreate(this._tree, suite.path.concat(result.state ? result.state.name : NO_STATE));
        node.browsers = Array.isArray(node.browsers) ? node.browsers : [];

        const existing = _.findIndex(node.browsers, {name: testResult.name});

        if (existing === -1) {
            node.browsers.push({name: testResult.name, result: testResult, retries: []});
            return;
        }

        const stateInBrowser = node.browsers[existing];
        const previousResult = stateInBrowser.result;

        if (!previousResult.skipped) {
            stateInBrowser.retries.push(previousResult);
        }

        stateInBrowser.result = testResult;
    }

    _configureSuiteUrl(suiteUrl) {
        return _.isEmpty(this._pluginConfig.baseHost)
            ? suiteUrl
            : Uri(this._pluginConfig.baseHost).resource(suiteUrl).href();
    }
};

/**
 * @param {Object} node
 * @param {Array} statePath
 * @returns {Object}
 */
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

function wrapLinkByTag(text) {
    return text.replace(/https?:\/\/[^\s]*/g, (url) => {
        return `<a target="_blank" href="${url}">${url}</a>`;
    });
}
