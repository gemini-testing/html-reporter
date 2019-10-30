'use strict';

const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const Promise = require('bluebird');

const Runner = require('./runner');
const subscribeOnToolEvents = require('./report-subscriber');
const {formatTests, formatId, getShortMD5, mkFullTitle, renameDatabaseForReuse, getDataFromDatabase, findTestResult} = require('./utils');
const ReportBuilderSqlite = require('../../report-builder/report-builder-sqlite');
const ReportBuilderJson = require('../../report-builder/report-builder-json');
const EventSource = require('../event-source');
const utils = require('../../server-utils');
const {isSqlite} = require('../../common-utils');
const {findNode} = require('../../../lib/static/modules/utils');
const reporterHelper = require('../../reporter-helpers');
const {UPDATED} = require('../../constants/test-statuses');
const constantPaths = require('../../constants/paths');
const logger = utils.logger;

module.exports = class ToolRunner {
    static create(paths, hermione, configs) {
        return new this(paths, hermione, configs);
    }

    constructor(paths, hermione, {program: globalOpts, pluginConfig, options: guiOpts}) {
        this._testFiles = [].concat(paths);
        this._hermione = hermione;
        this._tree = null;
        this._collection = null;

        this._globalOpts = globalOpts;
        this._guiOpts = guiOpts;
        this._reportPath = pluginConfig.path;
        this._pluginConfig = pluginConfig;

        this._eventSource = new EventSource();
        this._reportBuilder = null;

        this.saveResultsToDb = isSqlite(pluginConfig.saveFormat);
        this._tests = {};
    }

    get config() {
        return this._hermione.config;
    }

    get tree() {
        return this._tree;
    }

    async initialize() {
        let ReportBuilder;
        if (this.saveResultsToDb) {
            renameDatabaseForReuse(this._reportPath); //rename the old database because it will get overridden by ReportBuilderSqlite
            ReportBuilder = ReportBuilderSqlite;
        } else {
            ReportBuilder = ReportBuilderJson;
        }
        this._reportBuilder = await ReportBuilder.create(this._hermione, this._pluginConfig);
        this._reportBuilder.setApiValues(this._hermione.htmlReporter.values);
        return this._readTests()
            .then((collection) => {
                this._collection = collection;

                this._handleRunnableCollection();
                this._subscribeOnEvents();
            });
    }

    _readTests() {
        const {grep, set: sets, browser: browsers} = this._globalOpts;

        return this._hermione.readTests(this._testFiles, {grep, sets, browsers});
    }

    finalize() {
        return this._reportBuilder.finalize();
    }

    addClient(connection) {
        this._eventSource.addConnection(connection);
    }

    sendClientEvent(event, data) {
        this._eventSource.emit(event, data);
    }

    updateReferenceImage(tests) {
        const reportBuilder = this._reportBuilder;

        return Promise.map(tests, (test) => {
            const updateResult = this._prepareUpdateResult(test);
            const formattedResult = reportBuilder.format(updateResult, UPDATED);

            return Promise.map(updateResult.imagesInfo, (imageInfo) => {
                const {stateName} = imageInfo;

                return reporterHelper.updateReferenceImage(formattedResult, this._reportPath, stateName)
                    .then(() => {
                        const result = _.extend(updateResult, {refImg: imageInfo.expectedImg});

                        this._emitUpdateReference(result, stateName);
                    });
            }).then(() => {
                reportBuilder.addUpdated(updateResult);

                return findTestResult(reportBuilder.getSuites(), formattedResult.prepareTestResult());
            });
        });
    }

    async _fillTestsTree() {
        const {autoRun} = this._guiOpts;
        this._tree = Object.assign(this._reportBuilder.getResult(), {gui: true, autoRun});
        this._tree.suites = await this._applyReuseData(this._tree.suites);
    }

    async _applyReuseData(testSuites) {
        if (!testSuites) {
            return;
        }

        const reuseData = await this._loadReuseData();

        if (_.isEmpty(reuseData.suites)) {
            return testSuites;
        }

        return testSuites.map((suite) => applyReuse(reuseData)(suite));
    }

    async _loadReuseData() {
        if (this.saveResultsToDb) {
            const pathToDatabase = path.resolve(this._reportPath, constantPaths.DATABASE_TO_REUSE);
            if (!fs.existsSync(pathToDatabase)) {
                logger.warn(chalk.yellow(`Nothing to reuse in ${this._reportPath}`));
                return {};
            }
            return await getDataFromDatabase(pathToDatabase, this._reportBuilder);
        }

        try {
            return utils.require(path.resolve(this._reportPath, 'data'));
        } catch (e) {
            logger.warn(chalk.yellow(`Nothing to reuse in ${this._reportPath}`));
            return {};
        }
    }

    run(tests = []) {
        const {grep, set: sets, browser: browsers} = this._globalOpts;
        const formattedTests = _.flatMap([].concat(tests), (test) => formatTests(test));

        return Runner.create(this._collection, formattedTests)
            .run((collection) => this._hermione.run(collection, {grep, sets, browsers}));
    }

    async _handleRunnableCollection() {
        this._collection.eachTest((test, browserId) => {
            if (test.disabled || test.silentSkip) {
                return;
            }

            const testId = formatId(test.id(), browserId);
            this._tests[testId] = _.extend(test, {browserId});

            test.pending
                ? this._reportBuilder.addSkipped(test)
                : this._reportBuilder.addIdle(test);
        });

        await this._fillTestsTree();
    }

    _subscribeOnEvents() {
        subscribeOnToolEvents(this._hermione, this._reportBuilder, this._eventSource, this._reportPath);
    }

    _prepareUpdateResult(test) {
        const {browserId, attempt} = test;
        const fullTitle = mkFullTitle(test);
        const testId = formatId(getShortMD5(fullTitle), browserId);
        const testResult = this._tests[testId];
        const {sessionId, url} = test.metaInfo;
        const assertViewResults = [];

        const imagesInfo = test.imagesInfo.map((imageInfo) => {
            const {stateName, actualImg} = imageInfo;
            const path = this._hermione.config.browsers[browserId].getScreenshotPath(testResult, stateName);
            const refImg = {path, size: actualImg.size};

            assertViewResults.push({stateName, refImg, currImg: actualImg});

            return _.extend(imageInfo, {expectedImg: refImg});
        });

        return _.merge({}, testResult, {assertViewResults, imagesInfo, sessionId, attempt, meta: {url}, updated: true});
    }

    _emitUpdateReference({refImg}, state) {
        this._hermione.emit(
            this._hermione.events.UPDATE_REFERENCE,
            {refImg, state}
        );
    }
};

function applyReuse(reuseData) {
    let isBrowserResultReused = false;

    const reuseBrowserResult = (suite) => {
        if (suite.children) {
            suite.children = suite.children.map(reuseBrowserResult);

            if (isBrowserResultReused) {
                suite.status = getReuseStatus(reuseData.suites, suite);
            }
        }

        if (suite.browsers) {
            suite.browsers = suite.browsers.map((bro) => {
                const browserResult = getReuseBrowserResult(reuseData.suites, suite.suitePath, bro.name);

                if (browserResult) {
                    isBrowserResultReused = true;

                    suite.status = getReuseStatus(reuseData.suites, suite);
                }

                return _.extend(bro, browserResult);
            });
        }

        return suite;
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
