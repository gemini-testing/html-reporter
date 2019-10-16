'use strict';

const {CREATE_BLANK_REPORT: commandName} = require('./');
const createBlankReport = require('../create-blank-report');
const {logError} = require('../server-utils');

module.exports = (program, pluginConfig, hermione) => {
    program
        .command(`${commandName} [output path]`)
        .allowUnknownOption()
        .description('copy report presets to output directory')
        .action(async (path) => {
            try {
                await createBlankReport(hermione, pluginConfig, path);
            } catch (err) {
                logError(err);
                process.exit(1);
            }
        });
};
