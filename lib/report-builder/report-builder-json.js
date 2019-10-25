'use strict';

const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');

const {hasImage, logError, prepareCommonJSData, copyToReportDir} = require('../server-utils');
const {isSqlite} = require('../common-utils');
const TestAdapter = require('../test-adapter');
const ReportBuilder = require('./report-builder');

module.exports = class ReportBuilderJson extends ReportBuilder {
    static create(hermione, pluginConfig) {
        return new ReportBuilderJson(hermione, pluginConfig);
    }

    constructor(hermione, pluginConfig, TestAdapter) {
        super(hermione, pluginConfig, TestAdapter);
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
            return formattedResult;
        }

        this._updateNode({node, stateInBrowser, formattedResult, testResult});
        return formattedResult;
    }

    save() {
        return this.saveDataFileAsync()
            .then(() => copyToReportDir(['index.html', 'report.min.js', 'report.min.css'], path.resolve(__dirname, '../static')))
            .then(() => this)
            .catch(logError);
    }

    saveDataFileAsync() {
        return fs.mkdirs(this._pluginConfig.path)
            .then(() => this._saveDataFile(fs.writeFile));
    }

    saveDataFileSync() {
        fs.mkdirsSync(this._pluginConfig.path);
        this._saveDataFile(fs.writeFileSync);
    }

    _saveDataFile(saveFn) {
        // if we're saving data to a sqlite.db, the 'old' data file with be saved as dataJSON.js, in order for
        // user to still be able to access it. Will be deleted when we get rid of saving to JSON object

        const fileName = isSqlite(this._pluginConfig.saveFormat) ? 'dataJSON.js' : 'data.js';
        return saveFn(
            path.join(this._pluginConfig.path, fileName),
            prepareCommonJSData(this.getResult()),
            'utf8'
        );
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
            saveFormat: 'js'
        }, this._stats);
    }

    get reportPath() {
        return path.resolve(`${this._pluginConfig.path}/index.html`);
    }
};

