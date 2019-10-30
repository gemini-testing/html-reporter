'use strict';

const _ = require('lodash');

const {IDLE, RUNNING} = require('../constants/test-statuses');
const {hasImage, saveStaticFilesToReportDir, createDatabaseUrlsFile, logError} = require('../server-utils');
const TestAdapter = require('../test-adapter');
const SqliteAdapter = require('../sqlite-adapter');
const ReportBuilder = require('./report-builder');

const NO_STATE = 'NO_STATE';
const notSavedStatuses = [RUNNING, IDLE];

module.exports = class ReportBuilderSqlite extends ReportBuilder {
    static async create(hermione, pluginConfig) {
        const reportBuilder = new ReportBuilderSqlite(hermione, pluginConfig);
        await Promise.all(
            [
                saveStaticFilesToReportDir(hermione, pluginConfig, pluginConfig.path),
                reportBuilder.initSqliteConnection(pluginConfig.path),
                createDatabaseUrlsFile(pluginConfig.path, ['sqlite.db'])
            ]
        ).catch(e => logError(e));

        return reportBuilder;
    }

    constructor(hermione, pluginConfig, TestAdapter) {
        super(hermione, pluginConfig, TestAdapter);

        this._sqlite = null;
    }

    async initSqliteConnection(savePath) {
        this._sqlite = await SqliteAdapter.create(savePath);
    }

    format(result, status) {
        return result instanceof TestAdapter
            ? result
            : TestAdapter.create(result, this._hermione, status);
    }

    _addTestResult(formattedResult, props) {
        const testResult = this._createTestResult(formattedResult, _.extend(props, {attempt: formattedResult.attempt}));
        const node = this._getResultNode(formattedResult);
        const stateInBrowser = this._getStateInBrowser(node, formattedResult);

        if (!stateInBrowser) {
            this._initNode(node, formattedResult, testResult);
            formattedResult.image = hasImage(formattedResult);
            if (!notSavedStatuses.includes(testResult.status)) {
                this._writeTestResultToDb(testResult, formattedResult);
            }

            return formattedResult;
        }
        this._updateNode({node, stateInBrowser, formattedResult, testResult});

        if (!notSavedStatuses.includes(testResult.status)) {
            this._writeTestResultToDb(testResult, formattedResult);
        }

        return formattedResult;
    }

    _writeTestResultToDb(testResult, formattedResult) {
        const {suite} = formattedResult;
        const suitePath = suite.path.concat(formattedResult.state ? formattedResult.state.name : NO_STATE);
        const suiteName = formattedResult.state ? formattedResult.state.name : NO_STATE;
        this._sqlite.write({testResult, suitePath, suiteName});
    }

    saveReusedTestResult(testResult) {
        this._sqlite.insert(testResult);
    }

    save() {
        return Promise.resolve(); // added for code sustainability in report-subscriber when working in gui mode
    }

    finalize() {
        this._sqlite.close();
    }

    getResult() {
        const {defaultView, baseHost, scaleImages, lazyLoadOffset, errorPatterns, metaInfoBaseUrls} = this._pluginConfig;

        this._sortTree();
        return _.extend({
            skips: _.uniq(this._skips, JSON.stringify),
            suites: this._tree.children,
            config: {defaultView, baseHost, scaleImages, lazyLoadOffset, errorPatterns, metaInfoBaseUrls},
            apiValues: this._apiValues,
            date: new Date().toString(),
            saveFormat: 'sqlite'
        }, this._stats);
    }
};
