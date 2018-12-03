const ReportBuilder = require('./report-builder');

module.exports = async (srcPaths: string[], {destination: destPath}: {destination: string}) => {
    validateOpts(srcPaths, destPath);

    const reportBuilder = ReportBuilder.create(srcPaths, destPath);

    await reportBuilder.build();
};

function validateOpts(srcPaths: string[], destPath: string) {
    if (!srcPaths.length) {
        throw new Error('Nothing to merge, no source reports are passed');
    }

    // @ts-ignore
    if (srcPaths.includes(destPath)) {
        throw new Error(`Destination report path: ${destPath}, exists in source report paths`);
    }
}
