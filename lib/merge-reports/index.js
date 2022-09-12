'use strict';

const serverUtils = require('../server-utils');

module.exports = async (pluginConfig, hermione, srcPaths, {destination: destPath}) => {
    validateOpts(srcPaths, destPath);

    await Promise.all([
        serverUtils.saveStaticFilesToReportDir(hermione, pluginConfig, destPath),
        serverUtils.writeDatabaseUrlsFile(destPath, srcPaths)
    ]);

    await hermione.htmlReporter.emitAsync(hermione.htmlReporter.events.REPORT_SAVED, {reportPath: destPath});
};

function validateOpts(srcPaths, destPath) {
    if (!srcPaths.length) {
        throw new Error('Nothing to merge, no source reports are passed');
    }

    if (srcPaths.includes(destPath)) {
        throw new Error(`Destination report path: ${destPath}, exists in source report paths`);
    }
}
