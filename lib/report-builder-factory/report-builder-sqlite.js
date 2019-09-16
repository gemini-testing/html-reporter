'use strict';
const _ = require('lodash');
const {hasImage, logger} = require('../server-utils');
const ReportBuilder = require("./report-builder");

const NO_STATE = 'NO_STATE';

module.exports = class ReportBuilderSqlite extends ReportBuilder {
    static create(tool, pluginConfig, TestAdapter, SqliteAdapter) {
        return new ReportBuilderSqlite(tool, pluginConfig, TestAdapter, SqliteAdapter);
    }

    constructor(tool, pluginConfig, TestAdapter, SqliteAdapter) {
        super(tool, pluginConfig, TestAdapter);
        this._skips = [];
        this._tool = tool;
        this._pluginConfig = pluginConfig;
        this._TestAdapter = TestAdapter;
        this._sqlite = SqliteAdapter;
    }

    format(result, status) {
        return result instanceof this._TestAdapter
            ? result
            : this._TestAdapter.create(result, this._tool, status, true);
    }


    _addTestResult(formattedResult, props) {
        const testResult = this._createTestResult(formattedResult, _.extend(props, {attempt: formattedResult.attempt}));

        formattedResult.image = hasImage(formattedResult);

        this._writeTestResultToDb(testResult, formattedResult);
        return formattedResult;

    }

    _writeTestResultToDb(testResult, formattedResult) {
        const {suite} = formattedResult;
        const suitePath = suite.path.concat(formattedResult.state ? formattedResult.state.name : NO_STATE);
        const suiteName = formattedResult.state ? formattedResult.state.name : NO_STATE;
        this._sqlite.write({testResult, suitePath, suiteName});
    }


    save() {
        this._sqlite.close();
        return () => this._copyToReportDir(['index.html', 'report.min.js', 'report.min.css'])
            .then(() => this)
            .catch((e) => logger.warn(e.message || e));
    }

};



