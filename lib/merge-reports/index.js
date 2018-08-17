'use strict';

const ReportBuilder = require('./report-builder');

module.exports = async (srcPaths, {destination: destPath}) => {
    validateOpts(srcPaths, destPath);

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
