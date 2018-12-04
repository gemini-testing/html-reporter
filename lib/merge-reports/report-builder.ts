import path from 'path';
import _ from 'lodash';
// @ts-ignore
import Promise from 'bluebird';
const fs = Promise.promisifyAll(require('fs-extra'));
import chalk from 'chalk';
const DataTree = require('./data-tree');
const serverUtils = require('../server-utils');

import {IData} from 'typings/data';

interface IFromTo {
    from: string;
    to: string;
}

module.exports = class ReportBuilder {
    static create(srcPaths: string[], destPath: string) {
        return new this(srcPaths, destPath);
    }

    constructor(
        public srcPaths: string[],
        public destPath: string
    ) {}

    async build() {
        await moveContentToReportDir({from: this.srcPaths[0], to: this.destPath});

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

    async _copyToReportDir(files: string[], {from, to}: IFromTo) {
        await Promise.map(files, async (dataName) => {
            const srcDataPath = path.resolve(from, dataName);
            const destDataPath = path.resolve(to, dataName);

            await fs.moveAsync(srcDataPath, destDataPath);
        });
    }

    async _saveDataFile(data: IData) {
        const formattedData = serverUtils.prepareCommonJSData(data);
        const destDataPath = path.resolve(this.destPath, 'data.js');

        await fs.writeFile(destDataPath, formattedData);
    }
};

async function moveContentToReportDir({from, to}: IFromTo) {
    const files = await fs.readdirAsync(path.resolve(from));

    await Promise.map(files, async (fileName: string) => {
        if (fileName === 'data.js') {
            return;
        }

        const srcFilePath = path.resolve(from, fileName);
        const destFilePath = path.resolve(to, fileName);

        await fs.moveAsync(srcFilePath, destFilePath, {overwrite: true});
    });
}
