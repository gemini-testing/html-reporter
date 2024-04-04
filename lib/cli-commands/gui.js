'use strict';

const {cliCommands} = require('.');
const runGui = require('../gui').default;
const {Api} = require('../gui/api');

const {GUI: commandName} = cliCommands;

module.exports = (program, pluginConfig, testplane) => {
    // must be executed here because it adds `gui` field in `gemini`, `testplane` and `hermione tool`,
    // which is available to other plugins and is an API for interacting with the current plugin
    const guiApi = Api.create(testplane);

    program
        .command(`${commandName} [paths...]`)
        .allowUnknownOption()
        .description('update the changed screenshots or gather them if they does not exist')
        .option('-p, --port <port>', 'Port to launch server on', 8000)
        .option('--hostname <hostname>', 'Hostname to launch server on', 'localhost')
        .option('-a, --auto-run', 'auto run immediately')
        .option('-O, --no-open', 'not to open a browser window after starting the server')
        .action((paths, options) => {
            runGui({paths, testplane, guiApi, configs: {options, program, pluginConfig}});
        });
};
