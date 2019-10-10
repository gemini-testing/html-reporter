'use strict';

const _ = require('lodash');
const {hasImage, saveFilesToReportDir} = require('../server-utils');
const ReportBuilder = require('./report-builder');
const SqliteAdapter = require('../sqlite-adapter');

const NO_STATE = 'NO_STATE';

module.exports = class ReportBuilderSqlite extends ReportBuilder {
    static async create(tool, pluginConfig, TestAdapter) {
        const reportBuilder = new ReportBuilderSqlite(tool, pluginConfig, TestAdapter);
        await Promise.all([saveFilesToReportDir(tool, pluginConfig), reportBuilder.initSqliteConnection(pluginConfig.path)]);
        return reportBuilder;
    }

    constructor(tool, pluginConfig, TestAdapter) {
        super(tool, pluginConfig, TestAdapter);

        this._sqlite = null;
    }

    async initSqliteConnection(savePath) {
        this._sqlite = await SqliteAdapter.create(savePath, 'sqlite.db');
    }
    format(result, status) {
        return result instanceof this._TestAdapter
            ? result
            : this._TestAdapter.create(result, this._tool, status, false);
    }

    _addTestResult(formattedResult, props) {
        const testResult = this._createTestResult(formattedResult, _.extend(props, {attempt: formattedResult.attempt}));
        formattedResult.image = hasImage(formattedResult);
        const newResult = extendTestWithImagePaths(testResult, formattedResult);
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

function extendTestWithImagePaths(test, formattedResult) {
    const newImagesInfo = formattedResult.getImagesInfo(test.status);
    return _.set(test, 'imagesInfo', newImagesInfo);
}
