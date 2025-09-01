'use strict';

const {cliCommands} = require('./index');
const {logError} = require('../../server-utils');

const {MERGE_REPORTS: commandName} = cliCommands;

module.exports = (program, toolAdapter) => {
    program
        .command(`${commandName} [paths...]`)
        .allowUnknownOption()
        .description('merge reports')
        .option('-d, --destination <destination>', 'path to directory with merged report', toolAdapter.reporterConfig.path)
        .option('-h, --header <header>', 'http header for databaseUrls.json files from source paths', collect, [])
        .action(async (paths, options) => {
            try {
                const {destination: destPath, header: headers} = options;

                await require('../../merge-reports').mergeReports(toolAdapter, paths, {destPath, headers});

                process.exit(0);
            } catch (err) {
                logError(err);
                process.exit(1);
            }
        });
};

function collect(newValue, array = []) {
    return array.concat(newValue);
}
