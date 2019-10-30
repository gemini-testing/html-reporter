'use strict';

const {MERGE_REPORTS: commandName} = require('./');
const mergeReports = require('../merge-reports');
const {logError} = require('../server-utils');

module.exports = (program, pluginConfig, hermione) => {
    program
        .command(`${commandName} [paths...]`)
        .allowUnknownOption()
        .description('merge reports')
        .option('-d, --destination <destination>', 'path to directory with merged report', pluginConfig.path)
        .action(async (paths, options) => {
            try {
                await mergeReports(pluginConfig, hermione, paths, options);
            } catch (err) {
                logError(err);
                process.exit(1);
            }
        });
};
