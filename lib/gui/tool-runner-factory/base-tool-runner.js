'use strict';

const path = require('path');
const _ = require('lodash');
const chalk = require('chalk');
const temp = require('temp');
const EventSource = require('../event-source');
const utils = require('../../server-utils');
const {findNode} = require('../../../lib/static/modules/utils');

temp.track();

module.exports = class ToolRunner {
    constructor(paths) {
        this._testFiles = [].concat(paths);
        this._eventSource = new EventSource();
        this.diffDir = temp.path('gemini-gui-diff');
        this.currentDir = temp.path('gemini-gui-curr');
    }

    addClient(connection) {
        this._eventSource.addConnection(connection);
    }

    sendClientEvent(event, data) {
        this._eventSource.emit(event, data);
    }

    getTree() {
        return this.tree;
    }

    _loadReuseData() {
        try {
            return utils.require(path.resolve(this._reportPath, 'data'));
        } catch (e) {
            utils.logger.warn(chalk.yellow(`Nothing to reuse in ${this._reportPath}`));
            return {};
        }
    }

    _applyReuseData(testSuites) {
        const reuseData = this._loadReuseData();

        if (_.isEmpty(reuseData.suites)) {
            return testSuites;
        }

        return testSuites.map(applyReuse(reuseData));
    }
};

function applyReuse(reuseData) {
    let isBrowserResultReused = false;

    const reuseBrowserResult = (suite) => {
        if (suite.children) {
            suite.children = suite.children.map(reuseBrowserResult);

            return isBrowserResultReused
                ? _.set(suite, 'status', getReuseStatus(reuseData.suites, suite.suitePath))
                : suite;
        }

        return _.set(suite, 'browsers', suite.browsers.map((bro) => {
            const browserResult = getReuseBrowserResult(reuseData.suites, suite.suitePath, bro.name);

            if (browserResult) {
                isBrowserResultReused = true;
                suite.status = getReuseStatus(reuseData.suites, suite.suitePath);
            }

            return _.extend(bro, browserResult);
        }));
    };

    return reuseBrowserResult;
}

function getReuseStatus(reuseSuites, suitePath) {
    return findNode(reuseSuites, suitePath).status;
}

function getReuseBrowserResult(reuseSuites, suitePath, browserId) {
    const reuseNode = findNode(reuseSuites, suitePath);
    return _.find(_.get(reuseNode, 'browsers'), {name: browserId});
}
