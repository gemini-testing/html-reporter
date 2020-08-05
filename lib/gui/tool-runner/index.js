'use strict';

const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const Promise = require('bluebird');

const Runner = require('./runner');
const subscribeOnToolEvents = require('./report-subscriber');
const GuiReportBuilder = require('../../report-builder/gui');
const EventSource = require('../event-source');
const utils = require('../../server-utils');
const reporterHelper = require('../../reporter-helpers');
const {UPDATED} = require('../../constants/test-statuses');
const constantFileNames = require('../../constants/file-names');
const logger = utils.logger;
const {
    formatTests,
    formatId, getShortMD5,
    mkFullTitle,
    mergeDatabasesForReuse,
    getDataFromDatabase,
    findTestResult
} = require('./utils');

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

        this._tests = {};
    }

    get config() {
        return this._hermione.config;
    }

    get tree() {
        const {suites} = this._reportBuilder.getResult();
        return {...this._tree, suites};
    }

    async initialize() {
        await mergeDatabasesForReuse(this._reportPath);

        this._reportBuilder = GuiReportBuilder.create(this._hermione, this._pluginConfig, {reuse: true});
        await this._reportBuilder.init();
        await this._reportBuilder.saveStaticFiles();

        this._subscribeOnEvents();
        this._reportBuilder.setApiValues(this._hermione.htmlReporter.values);
        this._collection = await this._readTests();
        await this._handleRunnableCollection();
    }

    async _readTests() {
        const {grep, set: sets, browser: browsers} = this._globalOpts;

        return await this._hermione.readTests(this._testFiles, {grep, sets, browsers});
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

            if (formattedResult.attempt < updateResult.attempt) {
                formattedResult.attempt = updateResult.attempt;
            }

            return Promise.map(updateResult.imagesInfo, (imageInfo) => {
                const {stateName} = imageInfo;

                return reporterHelper.updateReferenceImage(formattedResult, this._reportPath, stateName)
                    .then(() => {
                        const result = _.extend(updateResult, {refImg: imageInfo.expectedImg});

                        this._emitUpdateReference(result, stateName);
                    });
            })
                .then(() => reportBuilder.addUpdated(updateResult))
                .then(() => findTestResult(reportBuilder.getSuites(), formattedResult.prepareTestResult()));
        });
    }

    run(tests = []) {
        const {grep, set: sets, browser: browsers} = this._globalOpts;
        const formattedTests = _.flatMap([].concat(tests), (test) => formatTests(test));

        return Runner.create(this._collection, formattedTests)
            .run((collection) => this._hermione.run(collection, {grep, sets, browsers}));
    }

    async _handleRunnableCollection() {
        this._collection.eachTest((test, browserId) => {
            if (test.disabled || this._isSilentlySkipped(test)) {
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

    _isSilentlySkipped({silentSkip, parent}) {
        return silentSkip || parent && this._isSilentlySkipped(parent);
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

    async _fillTestsTree() {
        const {autoRun} = this._guiOpts;
        const testsTree = await this._loadDataFromDatabase();

        if (!_.isEmpty(testsTree)) {
            this._reportBuilder.reuseTestsTree(testsTree);
        }

        this._tree = {...this._reportBuilder.getResult(), gui: true, autoRun};
    }

    async _loadDataFromDatabase() {
        const dbPath = path.resolve(this._reportPath, constantFileNames.LOCAL_DATABASE_NAME);

        if (await fs.pathExists(dbPath)) {
            return getDataFromDatabase(dbPath);
        }

        logger.warn(chalk.yellow(`Nothing to reuse in ${this._reportPath}: can not load data from ${constantFileNames.DATABASE_URLS_JSON_NAME}`));

        return {};
    }
};
