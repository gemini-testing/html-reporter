'use strict';
const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');
const {hasImage, logger, prepareConfigData} = require('../server-utils');
const ReportBuilder = require("./report-builder");
const SqliteAdapter = require('../sqlite-adapter');

const NO_STATE = 'NO_STATE';

module.exports = class ReportBuilderSqlite extends ReportBuilder {
    static create(tool, pluginConfig, TestAdapter) {
        return new ReportBuilderSqlite(tool, pluginConfig, TestAdapter);
    }

    constructor(tool, pluginConfig, TestAdapter) {
        super(tool, pluginConfig, TestAdapter);
        this._sqlite = SqliteAdapter.create(pluginConfig, 'sqlite.db').init();
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
        return this.saveConfigFileAsync()
            .then(() => this._copyToReportDir(['index.html', 'report.min.js', 'report.min.css']))
            .then(() => this)
            .catch((e) => logger.warn(e.message || e));
    }

    saveConfigFileAsync() {
        return fs.mkdirs(this._pluginConfig.path)
            .then(() => this._saveConfigFile(fs.writeFile));
    }

    _saveConfigFile(saveFn) {
        return saveFn(
            path.join(this._pluginConfig.path, 'config.js'),
            prepareConfigData(this.getConfig()),
            'utf8'
        );
    }

    getConfig() {
        const {defaultView, baseHost, scaleImages, lazyLoadOffset, errorPatterns, metaInfoBaseUrls} = this._pluginConfig;
        return _.extend({
            skips: _.uniq(this._skips, JSON.stringify),
            config: {defaultView, baseHost, scaleImages, lazyLoadOffset, errorPatterns, metaInfoBaseUrls},
            apiValues: this._apiValues,
            date: new Date().toString()
        }, this._stats);
    }


};



