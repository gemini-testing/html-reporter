'use strict';

const runGui = require('../gui');
const Api = require('../gui/api');
const {GUI: commandName} = require('./');

module.exports = (program, pluginConfig, tool) => {
    // must be executed here because it adds `gui` field in `gemini` and `hermione tool`,
    // which is available to other plugins and is an API for interacting with the current plugin
    const guiApi = Api.create(tool);

    program
        .command(`${commandName} [paths...]`)
        .allowUnknownOption()
        .description('update the changed screenshots or gather them if they does not exist')
        .option('-p, --port <port>', 'Port to launch server on', 8000)
        .option('--hostname <hostname>', 'Hostname to launch server on', 'localhost')
        .option('-a, --auto-run', 'auto run immediately')
        .option('-O, --no-open', 'not to open a browser window after starting the server')
        .action((paths, options) => {
            runGui({paths, tool, guiApi, configs: {options, program, pluginConfig}});
        });
};
