'use strict';

const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');

const {prepareCommonJSData, copyToReportDir} = require('../server-utils');
const saveFormats = require('../constants/save-formats');
const {isSqlite} = require('../common-utils');
const ReportBuilder = require('./report-builder');

module.exports = class ReportBuilderJson extends ReportBuilder {
    static create(hermione, pluginConfig) {
        return new ReportBuilderJson(hermione, pluginConfig);
    }

    constructor(hermione, pluginConfig, TestAdapter) {
        super(hermione, pluginConfig, TestAdapter);
    }

    save() {
        return this.saveDataFileAsync()
            .then(() => {
                if (isSqlite(this._pluginConfig.saveFormat)) {
                    return;
                }
                return copyToReportDir(
                    this._pluginConfig.path,
                    ['index.html', 'report.min.js', 'report.min.css'],
                    path.resolve(__dirname, '../static')
                );
            })
            .then(() => this);
    }

    saveDataFileAsync() {
        return fs.mkdirs(this._pluginConfig.path)
            .then(() => this._saveDataFile(fs.writeFile));
    }

    finalize() {
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
            saveFormat: saveFormats.JS
        }, this._stats);
    }

    get reportPath() {
        return path.resolve(`${this._pluginConfig.path}/index.html`);
    }
};

