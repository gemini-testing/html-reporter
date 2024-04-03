'use strict';

const {cliCommands} = require('.');
const mergeReports = require('../merge-reports');
const {logError} = require('../server-utils');

const {MERGE_REPORTS: commandName} = cliCommands;

module.exports = (program, pluginConfig, testplane) => {
    program
        .command(`${commandName} [paths...]`)
        .allowUnknownOption()
        .description('merge reports')
        .option('-d, --destination <destination>', 'path to directory with merged report', pluginConfig.path)
        .option('-h, --header <header>', 'http header for databaseUrls.json files from source paths', collect, [])
        .action(async (paths, options) => {
            try {
                const {destination: destPath, header: headers} = options;

                await mergeReports(pluginConfig, testplane, paths, {destPath, headers});
            } catch (err) {
                logError(err);
                process.exit(1);
            }
        });
};

function collect(newValue, array = []) {
    return array.concat(newValue);
}
