'use strict';
var runGui = require('../gui');
var Api = require('../gui/api');
var GUI = require('./').GUI;
module.exports = function (program, pluginConfig, tool) {
    // must be executed here because it adds `gui` field in `gemini` and `hermione tool`,
    // which is available to other plugins and is an API for interacting with the current plugin
    var guiApi = Api.create(tool);
    program
        .command(GUI + "  [paths...]")
        .allowUnknownOption()
        .description('update the changed screenshots or gather them if they does not exist')
        .option('-p, --port <port>', 'Port to launch server on', 8000)
        .option('--hostname <hostname>', 'Hostname to launch server on', 'localhost')
        .option('-a, --auto-run', 'auto run immediately')
        .option('-O, --no-open', 'not to open a browser window after starting the server')
        .action(function (paths, options) {
        runGui({ paths: paths, tool: tool, guiApi: guiApi, configs: { options: options, program: program, pluginConfig: pluginConfig } });
    });
};
//# sourceMappingURL=gui.js.map