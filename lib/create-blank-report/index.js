'use strict';

const serverUtils = require('../server-utils');

module.exports = async (destPath, pluginConfig, tool) => {
    validateOpts(destPath);
    await serverUtils.saveFilesToReportDir(tool, pluginConfig, destPath);
};

function validateOpts(path) {
    if (!path) {
        throw new Error('No output directory is provided');
    }
}
