'use strict';

const chalk = require('chalk');
const opener = require('opener');
const server = require('./server');

module.exports = (program, tool, pluginConfig) => {
    program
        .command('gui [paths...]')
        .allowUnknownOption()
        .description('update the changed screenshots or gather them if they does not exist')
        .option('-p, --port <port>', 'Port to launch server on', 8000)
        .option('--hostname <hostname>', 'Hostname to launch server on', 'localhost')
        .option('-a, --auto-run', 'auto run immediately')
        .option('-O, --no-open', 'not to open a browser window after starting the server')
        .action((paths, options) => {
            return runGui(paths, tool, {options, program, pluginConfig});
        });
};

function runGui(paths, tool, configs) {
    server.start(paths, tool, configs).then(({url}) => {
        console.log(`GUI is running at ${chalk.cyan(url)}`);
        if (configs.options.open) {
            opener(url);
        }
    }).done();
}
