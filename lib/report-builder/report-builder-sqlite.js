'use strict';

const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');

const {IDLE, RUNNING} = require('../constants/test-statuses');
const {LOCAL_DATABASE_NAME} = require('../constants/file-names');
const {saveStaticFilesToReportDir, writeDatabaseUrlsFile} = require('../server-utils');
const SqliteAdapter = require('../sqlite-adapter');
const ReportBuilder = require('./report-builder');
const saveFormats = require('../constants/save-formats');

const NO_STATE = 'NO_STATE';
const ignoredStatuses = [RUNNING, IDLE];

module.exports = class ReportBuilderSqlite extends ReportBuilder {
    static create(...args) {
        return new ReportBuilderSqlite(...args);
    }

    constructor(hermione, pluginConfig, {reuse = false} = {}) {
        super(hermione, pluginConfig);

        this._sqliteAdapter = SqliteAdapter.create({
            reportPath: this._pluginConfig.path,
            reuse
        });
    }

    async init() {
        await this._sqliteAdapter.init();
    }

    async saveStaticFiles() {
        const destPath = this._pluginConfig.path;

        await Promise.all(
            [
                saveStaticFilesToReportDir(this._hermione, this._pluginConfig, destPath),
                writeDatabaseUrlsFile(destPath, [LOCAL_DATABASE_NAME])
            ]
        );
    }

    _addTestResult(formattedResult, props) {
        super._addTestResult(formattedResult, props);

        const testResult = this._createTestResult(formattedResult, _.extend(props, {attempt: formattedResult.attempt}));
        if (!ignoredStatuses.includes(testResult.status)) {
            this._writeTestResultToDb(testResult, formattedResult);
        }
        return formattedResult;
    }

    _writeTestResultToDb(testResult, formattedResult) {
        const {suite} = formattedResult;
        const suiteName = formattedResult.state ? formattedResult.state.name : NO_STATE;
        const suitePath = suite.path.concat(suiteName);

        this._sqliteAdapter.write({testResult, suitePath, suiteName});
    }

    save() {
        return Promise.resolve(); // added for code compatibility in report-subscriber when working in gui mode
    }

    async finalize() {
        this._sqliteAdapter.close();

        const reportsSaver = this._hermione.htmlReporter.reportsSaver;
        if (reportsSaver) {
            const reportDir = this._pluginConfig.path;
            const src = path.join(reportDir, LOCAL_DATABASE_NAME);
            const dbPath = await reportsSaver.saveReportData(src, {destPath: LOCAL_DATABASE_NAME, reportDir: reportDir});
            await writeDatabaseUrlsFile(reportDir, [dbPath]);
            await fs.remove(src);
        }
    }

    getSaveFormat() {
        return saveFormats.SQLITE;
    }
};
