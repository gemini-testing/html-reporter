'use strict';

const _ = require('lodash');
const {hasImage, saveStaticFilesToReportDir} = require('../server-utils');
const ReportBuilder = require('./report-builder');
const SqliteAdapter = require('../sqlite-adapter');
const TestAdapter = require('../test-adapter');

const NO_STATE = 'NO_STATE';

module.exports = class ReportBuilderSqlite extends ReportBuilder {
    static async create(hermione, pluginConfig) {
        const reportBuilder = new ReportBuilderSqlite(hermione, pluginConfig);
        await Promise.all([saveStaticFilesToReportDir(hermione, pluginConfig, pluginConfig.path), reportBuilder.initSqliteConnection(pluginConfig.path)]);

        return reportBuilder;
    }

    constructor(hermione, pluginConfig) {
        super(hermione, pluginConfig);

        this._sqlite = null;
    }

    async initSqliteConnection(savePath) {
        this._sqlite = await SqliteAdapter.create(savePath);
    }

    format(result, status) {
        return result instanceof TestAdapter
            ? result
            : TestAdapter.create(result, this._hermione, status, false);
    }

    _addTestResult(formattedResult, props) {
        const testResult = this._createTestResult(formattedResult, _.extend(props, {attempt: formattedResult.attempt}));
        formattedResult.image = hasImage(formattedResult);
        const newResult = this._extendTestWithImagePaths(testResult, formattedResult);
        this._writeTestResultToDb(newResult, formattedResult);

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
    }
};

