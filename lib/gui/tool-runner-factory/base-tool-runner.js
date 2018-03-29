'use strict';

const path = require('path');
const _ = require('lodash');
const chalk = require('chalk');
const ReportBuilderFactory = require('../../report-builder-factory');
const EventSource = require('../event-source');
const utils = require('../../server-utils');
const {findNode} = require('../../../lib/static/modules/utils');

module.exports = class ToolRunner {
    static create(paths, tool, configs) {
        return new this(paths, tool, configs);
    }

    constructor(paths, tool, {program: globalOpts, pluginConfig, options: guiOpts}) {
        const toolName = globalOpts.name();

        this._testFiles = [].concat(paths);
        this._tool = tool;
        this._tree = null;

        this._globalOpts = globalOpts;
        this._guiOpts = guiOpts;
        this._reportPath = pluginConfig.path;

        this._eventSource = new EventSource();
        this._reportBuilder = ReportBuilderFactory.create(toolName, tool.config, pluginConfig);
    }

    get config() {
        return this._tool.config;
    }

    get tree() {
        return this._tree;
    }

    initialize() {
        return this._readTests()
            .then(() => this._subscribeOnEvents());
    }

    addClient(connection) {
        this._eventSource.addConnection(connection);
    }

    sendClientEvent(event, data) {
        this._eventSource.emit(event, data);
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
        if (!testSuites) {
            return;
        }

        const reuseData = this._loadReuseData();

        if (_.isEmpty(reuseData.suites)) {
            return testSuites;
        }

        return testSuites.map((suite) => applyReuse(reuseData)(suite));
    }
};

function applyReuse(reuseData) {
    let isBrowserResultReused = false;

    const reuseBrowserResult = (suite) => {
        if (suite.children) {
            suite.children = suite.children.map(reuseBrowserResult);

            return isBrowserResultReused
                ? _.set(suite, 'status', getReuseStatus(reuseData.suites, suite))
                : suite;
        }

        return _.set(suite, 'browsers', suite.browsers.map((bro) => {
            const browserResult = getReuseBrowserResult(reuseData.suites, suite.suitePath, bro.name);

            if (browserResult) {
                isBrowserResultReused = true;
                suite.status = getReuseStatus(reuseData.suites, suite);
            }

            return _.extend(bro, browserResult);
        }));
    };

    return reuseBrowserResult;
}

function getReuseStatus(reuseSuites, {suitePath, status: defaultStatus}) {
    const reuseNode = findNode(reuseSuites, suitePath);
    return _.get(reuseNode, 'status', defaultStatus);
}

function getReuseBrowserResult(reuseSuites, suitePath, browserId) {
    const reuseNode = findNode(reuseSuites, suitePath);
    return _.find(_.get(reuseNode, 'browsers'), {name: browserId});
}
