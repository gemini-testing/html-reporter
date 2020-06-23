'use strict';

const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');

const {IDLE, RUNNING} = require('../constants/test-statuses');
const {LOCAL_DATABASE_NAME} = require('../constants/file-names');
const SqliteAdapter = require('../sqlite-adapter');
const ReportBuilder = require('./report-builder');
const {
    saveStaticFilesToReportDir,
    writeDatabaseUrlsFile
} = require('../server-utils');

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

    setBrowsers(browsers) {
        this._sqliteAdapter.writeBrowsers(browsers);
    }

    format(result, status) {
        result.timestamp = Date.now();
        return super.format(result, status);
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

        const testResult = this._createTestResult(formattedResult, _.extend(props, {
            timestamp: formattedResult.timestamp
        }));
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
};
