'use strict';

const {CREATE_BLANK_REPORT: commandName} = require('./');
const createBlankReport = require('../create-blank-report');
const {logError} = require('../server-utils');

module.exports = (program, pluginConfig, hermione) => {
    program
        .command(`${commandName} [paths...]`)
        .allowUnknownOption()
        .description('copy report presets to output directory')
        .option('-d, --destination <destination>', 'path to directory with merged report', pluginConfig.path)
        .action(async (paths, options) => {
            try {
                await createBlankReport(hermione, pluginConfig, paths, options);
            } catch (err) {
                logError(err);
                process.exit(1);
            }
        });
};
