'use strict';

const {commands} = require('..');
const runGui = require('../../gui').default;

const {GUI: commandName} = commands;

module.exports = (cliTool, toolAdapter) => {
    // must be executed here because it adds `gui` field in tool instance,
    // which is available to other plugins and is an API for interacting with the current plugin
    toolAdapter.initGuiApi();

    cliTool
        .command(`${commandName} [paths...]`)
        .allowUnknownOption()
        .description('update the changed screenshots or gather them if they does not exist')
        .option('-p, --port <port>', 'Port to launch server on', 8000)
        .option('--hostname <hostname>', 'Hostname to launch server on', 'localhost')
        .option('-a, --auto-run', 'auto run immediately')
        .option('-O, --no-open', 'not to open a browser window after starting the server')
        .action((paths, options) => {
            runGui({paths, toolAdapter, cli: {options, tool: cliTool}});
        });
};
