'use strict';

const {isSqlite} = require('../common-utils');
const ReportBuilder = require('./report-builder');
const serverUtils = require('../server-utils');

module.exports = async (pluginConfig, hermione, srcPaths, {destination: destPath}) => {
    validateOpts(srcPaths, destPath);

    if (isSqlite(pluginConfig.saveFormat)) {
        await Promise.all([
            serverUtils.saveStaticFilesToReportDir(hermione, pluginConfig, destPath),
            serverUtils.createDatabaseUrlsFile(destPath, srcPaths)
        ]).catch(e => {
            throw e;
        });

        return;
    }

    const reportBuilder = ReportBuilder.create(srcPaths, destPath);

    await reportBuilder.build();
};

function validateOpts(srcPaths, destPath) {
    if (!srcPaths.length) {
        throw new Error('Nothing to merge, no source reports are passed');
    }

    if (srcPaths.includes(destPath)) {
        throw new Error(`Destination report path: ${destPath}, exists in source report paths`);
    }
}
