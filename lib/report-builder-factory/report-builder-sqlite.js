'use strict';
const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');
const {hasImage, logger, prepareCommonJSData} = require('../server-utils');
const ReportBuilder = require('./report-builder');
const SqliteAdapter = require('../sqlite-adapter');

const NO_STATE = 'NO_STATE';

module.exports = class ReportBuilderSqlite extends ReportBuilder {
    static create(tool, pluginConfig, TestAdapter) {
        return new ReportBuilderSqlite(tool, pluginConfig, TestAdapter);
    }

    constructor(tool, pluginConfig, TestAdapter) {
        super(tool, pluginConfig, TestAdapter);
        this._sqlite = SqliteAdapter.create(pluginConfig, 'sqlite.db').init();
        this._saveFormat = 'sqlite';
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
        return this.saveConfigFileAsync()
            .then(() => this._sqlite.close())
            .then(() => this._copyToReportDir(['index.html', 'report.min.js', 'report.min.css']))
            .then(() => this._copyToReportDir(['sql-wasm.js', 'sql-wasm.wasm'], path.resolve(__dirname, '../../node_modules/sql.js/dist')))
            .catch((e) => logger.warn(e.message || e));
    }

    saveConfigFileAsync() {
        return fs.mkdirs(this._pluginConfig.path)
            .then(() => this._saveConfigFile(fs.writeFile));
    }

    _saveConfigFile(saveFn) {
        return saveFn(
            path.join(this._pluginConfig.path, 'data.js'),
            prepareCommonJSData(this.getConfig()),
            'utf8'
        );
    }

    getConfig() {
        const {defaultView, baseHost, scaleImages, lazyLoadOffset, errorPatterns, metaInfoBaseUrls} = this._pluginConfig;
        return _.extend({
            skips: _.uniq(this._skips, JSON.stringify),
            config: {defaultView, baseHost, scaleImages, lazyLoadOffset, errorPatterns, metaInfoBaseUrls},
            apiValues: this._apiValues,
            date: new Date().toString(),
            saveFormat: this._saveFormat
        }, this._stats);
    }
};

function extendTestWithImagePaths(test, formattedResult) {
    const newImagesInfo = formattedResult.getImagesInfo(test.status);
    return _.set(test, 'imagesInfo', newImagesInfo);
}
