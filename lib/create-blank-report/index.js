'use strict';

const path = require('path');
const fs = require('fs-extra');
const Promise = require('bluebird');
const serverUtils = require('../server-utils');

module.exports = async (destPath, pluginConfig, tool) => {
    validateOpts(destPath);
    await createDummyDataJsFile(destPath, pluginConfig, tool);
    await moveStaticFiles(destPath);
    await moveSqlJsFiles(destPath);
};

function validateOpts(path) {
    if (!path) {
        throw new Error('No output directory is provided');
    }
}

function moveSqlJsFiles(destPath) {
    return Promise.map(['sql-wasm.js', 'sql-wasm.wasm'], (fileName) => {
        const from = path.resolve(__dirname, '../../node_modules/sql.js/dist', fileName);
        const to = path.resolve(destPath, fileName);

        return fs.copy(from, to);
    });
}

function moveStaticFiles(destPath) {
    return Promise.map(['index.html', 'report.min.js', 'report.min.css'], (fileName) => {
        const from = path.resolve(__dirname, '../static', fileName);
        const to = path.resolve(destPath, fileName);

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

    const preparedData = serverUtils.prepareCommonJSData(configData);
    fs.writeFileSync(path.resolve(destPath, 'data.js'), preparedData, 'utf8');
}
