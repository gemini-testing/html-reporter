'use strict';

const path = require('path');
const _ = require('lodash');
const Promise = require('bluebird');
const fs = require('fs-extra');
const chalk = require('chalk');
const DataTree = require('./data-tree');
const serverUtils = require('../server-utils');

module.exports = class ReportBuilder {
    static create(srcPaths, destPath) {
        return new this(srcPaths, destPath);
    }

    constructor(srcPaths, destPath) {
        this.srcPaths = srcPaths;
        this.destPath = destPath;
    }

    async build() {
        // ignore folder with images as we move them in DataTree._moveImages
        await Promise.map(this.srcPaths, async (srcPath) => moveContentToReportDir({
            from: srcPath, to: this.destPath, skips: ['data.js', 'images']
        }));

        const srcReportsData = this._loadReportsData();
        const dataTree = DataTree.create(srcReportsData[0], this.destPath);
        const srcDataCollection = _.zipObject(this.srcPaths.slice(1), srcReportsData.slice(1));

        const mergedData = await dataTree.mergeWith(srcDataCollection);

        await this._saveDataFile(mergedData);
    }

    _loadReportsData() {
        return _(this.srcPaths)
            .map((reportPath) => {
                const srcDataPath = path.resolve(reportPath, 'data');

                try {
                    return serverUtils.require(srcDataPath);
                } catch (err) {
                    serverUtils.logger.warn(chalk.yellow(`Not found data file in passed source report path: ${reportPath}`));
                    return {skips: [], suites: []};
                }
            })
            .value();
    }

    async _saveDataFile(data) {
        const formattedData = serverUtils.prepareCommonJSData(data);
        const destDataPath = path.resolve(this.destPath, 'data.js');

        await fs.writeFile(destDataPath, formattedData);
    }
};

async function moveContentToReportDir({from, to, skips = []}) {
    const files = await fs.readdir(path.resolve(from));
    const filesWithoutSkips = _.isEmpty(skips) ? files : _.difference(files, skips);

    await Promise.map(filesWithoutSkips, async (fileName) => {
        const srcFilePath = path.resolve(from, fileName);
        const destFilePath = path.resolve(to, fileName);

        const srcFileStat = await fs.stat(srcFilePath);

        if (srcFileStat.isDirectory()) {
            await fs.ensureDir(destFilePath);
            await moveContentToReportDir({from: srcFilePath, to: destFilePath});
        } else {
            await fs.move(srcFilePath, destFilePath, {overwrite: true});
        }
    }, {concurrency: 100});
}
