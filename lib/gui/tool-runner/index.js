'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const sqlite3 = require('sqlite3').verbose();
const Promise = require('bluebird');

const Runner = require('./runner');
const subscribeOnToolEvents = require('./report-subscriber');
const {formatTests, formatId, getShortMD5, mkFullTitle} = require('./utils');
const ReportBuilderSqlite = require('../../report-builder/report-builder-sqlite');
const ReportBuilderJson = require('../../report-builder/report-builder-json');
const EventSource = require('../event-source');
const utils = require('../../server-utils');
const {findTestResult} = require('./utils');
const {findNode} = require('../../../lib/static/modules/utils');
const reporterHelper = require('../../reporter-helpers');
const {UPDATED} = require('../../constants/test-statuses');
const {formatTestAttempt} = require('../../../lib/static/modules/databaseUtils');

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

        this._eventSource = new EventSource();
        this._reportBuilder = null;

        this.saveFormat = pluginConfig.saveFormat;
        this._tests = {};
    }

    get config() {
        return this._hermione.config;
    }

    get tree() {
        return this._tree;
    }

    async initialize(hermione, pluginConfig) {
        let ReportBuilder;
        if (this.saveFormat === 'sqlite') {
            this._renameDatabaseForReuse(); //rename the old database because it will get overridden by ReportBuilderSqlite
            ReportBuilder = ReportBuilderSqlite;
        } else {
            ReportBuilder = ReportBuilderJson;
        }
        // const ReportBuilder = this.saveFormat === 'sqlite' ? ReportBuilderSqliteGui : ReportBuilderJson;
        this._reportBuilder = await ReportBuilder.create(hermione, pluginConfig);
        this._reportBuilder.setApiValues(hermione.htmlReporter.values);
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
        if (this.saveFormat === 'sqlite') {
            return;
        }
        this._reportBuilder.saveDataFileSync();
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

    _fillTestsTree() {
        const {autoRun} = this._guiOpts;
        this._tree = Object.assign(this._reportBuilder.getResult(), {gui: true, autoRun});
        this._tree.suites = this._applyReuseData(this._tree.suites);
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

    _loadReuseData() {
        if (this.saveFormat === 'sqlite') {
            if (!fs.existsSync(path.resolve(this._reportPath, 'old_sqlite.db'))) {
                utils.logger.warn(chalk.yellow(`Nothing to reuse in ${this._reportPath}`));

                return {};
            }

            const database = new sqlite3.Database(path.resolve(this._reportPath, 'old_sqlite.db'));
            database.all('SELECT * FROM suites', [], (err, rows) => {
                if (err) {
                    throw err;
                }
                database.close();
                this._parseDatabaseRows(rows);
                return {};
            });

            return {};
        }
        try {
            return utils.require(path.resolve(this._reportPath, 'data'));
        } catch (e) {
            utils.logger.warn(chalk.yellow(`Nothing to reuse in ${this._reportPath}`));
            return {};
        }
    }

    _parseDatabaseRows(rows) {
        for (const row of rows) {
            const formattedRow = formatTestAttempt(Object.values(row));
            console.log(formattedRow);
        }
    }

    _renameDatabaseForReuse() {
        try {
            fs.renameSync(path.resolve(this._reportPath, 'sqlite.db'), path.resolve(this._reportPath, 'old_sqlite.db'));
        } catch (e) {
            utils.logger.warn(chalk.yellow(`No database to reuse in ${this._reportPath}`));
        }
    }

    run(tests = []) {
        const {grep, set: sets, browser: browsers} = this._globalOpts;
        const formattedTests = _.flatMap([].concat(tests), (test) => formatTests(test));

        return Runner.create(this._collection, formattedTests)
            .run((collection) => this._hermione.run(collection, {grep, sets, browsers}));
    }

    _handleRunnableCollection() {
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

        this._fillTestsTree();
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
