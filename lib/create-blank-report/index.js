'use strict';

const path = require('path');
const fs = require('fs-extra');
const Promise = require('bluebird');
const {prepareCommonJSData} = require('../server-utils');

module.exports = async (destPath, pluginConfig, tool) => {
    validateOpts(destPath);
    await moveStaticFiles(destPath);
    createDummyDataJsFile(destPath, pluginConfig, tool);
};

function validateOpts(path) {
    if (!path) {
        throw new Error('No output directory is provided');
    }
}

function moveStaticFiles(destPath) {
    return Promise.map(['index.html', 'report.min.js', 'report.min.css', 'sql-wasm.js', 'sql-wasm.wasm'], (fileName) => {
        const from = path.resolve(__dirname, '../static', fileName);
        const to = path.join(destPath, fileName);

        return fs.copy(from, to);
    });
}

function createDummyDataJsFile(destPath, pluginConfig, tool) {
    const {defaultView, baseHost, scaleImages, lazyLoadOffset, errorPatterns, metaInfoBaseUrls} = pluginConfig;
    const configData = {
        skips: [],
        config: {defaultView, baseHost, scaleImages, lazyLoadOffset, errorPatterns, metaInfoBaseUrls},
        apiValues: tool.htmlReporter.values,
        date: new Date().toString(),
        saveFormat: 'sqlite',
        total: 0,
        updated: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        retries: 0,
        warned: 0
    };

    fs.writeFileSync(path.join(destPath, 'data.js'), prepareCommonJSData(configData), 'utf8');
}
