'use strict';

const serverUtils = require('../server-utils');

module.exports = async (hermione, pluginConfig, destPath) => {
    validateOpts(destPath);
    await serverUtils.saveStaticFilesToReportDir(hermione, pluginConfig, destPath);
};

function validateOpts(path) {
    if (!path) {
        throw new Error('No output directory is provided');
    }
}
