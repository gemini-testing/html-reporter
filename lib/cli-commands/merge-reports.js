'use strict';

const {MERGE_REPORTS: commandName} = require('./');
const mergeReports = require('../merge-reports');
const {logError} = require('../server-utils');

module.exports = (program, {path}) => {
    program
        .command(`${commandName} [paths...]`)
        .allowUnknownOption()
        .description('merge reports')
        .option('-d, --destination <destination>', 'path to directory with merged report', path)
        .action(async (paths, options) => {
            try {
                await mergeReports(paths, options);
            } catch (err) {
                logError(err);
                process.exit(1);
            }
        });
};
