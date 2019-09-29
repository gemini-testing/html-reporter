'use strict';

const {CREATE_BLANK_REPORT: commandName} = require('./');
const createBlankReport = require('../create-blank-report');
const {logError} = require('../server-utils');

module.exports = (program, pluginConfig, tool) => {
    program
        .command(`${commandName} [output path...]`)
        .allowUnknownOption()
        .description('copy report presets to output directory')
        .action(async (path) => {
            try {
                await createBlankReport(path, pluginConfig, tool);
            } catch (err) {
                logError(err);
                process.exit(1);
            }
        });
};
