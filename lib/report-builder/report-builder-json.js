'use strict';

const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');

const {prepareCommonJSData, copyToReportDir} = require('../server-utils');
const saveFormats = require('../constants/save-formats');
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
        return saveFn(
            path.join(this._pluginConfig.path, 'data.js'),
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

