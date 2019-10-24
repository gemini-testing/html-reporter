'use strict';

const serverUtils = require('../server-utils');

module.exports = async (hermione, pluginConfig, dbLocations, {destination: destPath}) => {
    validateOpts(destPath);
    await Promise.all([
        serverUtils.saveStaticFilesToReportDir(hermione, pluginConfig, destPath),
        serverUtils.createDatabaseUrlsFile(destPath, dbLocations)
    ]);
};

function validateOpts(path) {
    if (!path) {
        throw new Error('No output directory is provided');
    }
}
