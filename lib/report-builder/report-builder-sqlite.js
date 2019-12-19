'use strict';

const _ = require('lodash');

const {IDLE, RUNNING} = require('../constants/test-statuses');
const {LOCAL_DATABASE_NAME} = require('../constants/file-names');
const {saveStaticFilesToReportDir, createDatabaseUrlsFile} = require('../server-utils');
const SqliteAdapter = require('../sqlite-adapter');
const ReportBuilder = require('./report-builder');
const saveFormats = require('../constants/save-formats');

const NO_STATE = 'NO_STATE';
const ignoredStatuses = [RUNNING, IDLE];

module.exports = class ReportBuilderSqlite extends ReportBuilder {
    static async create(hermione, pluginConfig) {
        const reportBuilder = new ReportBuilderSqlite(hermione, pluginConfig);
        await reportBuilder.initSqliteConnection(pluginConfig.path);
        return reportBuilder;
    }

    constructor(hermione, pluginConfig, TestAdapter) {
        super(hermione, pluginConfig, TestAdapter);

        this._sqlite = null;
    }

    async saveStaticFiles() {
        const destPath = this._pluginConfig.path;
        await Promise.all(
            [
                saveStaticFilesToReportDir(this._hermione, this._pluginConfig, destPath),
                createDatabaseUrlsFile(destPath, [LOCAL_DATABASE_NAME])
            ]
        );
    }

    async initSqliteConnection(savePath) {
        this._sqlite = await SqliteAdapter.create(savePath);
    }

    async _addTestResult(formattedResult, props) {
        super._addTestResult(formattedResult, props);

        const testResult = this._createTestResult(formattedResult, _.extend(props, {attempt: formattedResult.attempt}));
        if (!ignoredStatuses.includes(testResult.status)) {
            await this._writeTestResultToDb(testResult, formattedResult);
        }
        return formattedResult;
    }

    async _writeTestResultToDb(testResult, formattedResult) {
        const {suite} = formattedResult;
        const suiteName = formattedResult.state ? formattedResult.state.name : NO_STATE;
        const suitePath = suite.path.concat(suiteName);
        await this._sqlite.write({testResult, suitePath, suiteName});
    }

    saveReusedTestResult(testResult) {
        this._sqlite.insert(testResult);
    }

    save() {
        return Promise.resolve(); // added for code compatibility in report-subscriber when working in gui mode
    }

    finalize() {
        this._sqlite.close();
    }

    getSaveFormat() {
        return saveFormats.SQLITE;
    }
};
