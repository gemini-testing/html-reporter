'use strict';

const chalk = require('chalk');
const opener = require('opener');
const server = require('./server');
const Api = require('./api');
const {logger} = require('../server-utils');

module.exports = (program, tool, pluginConfig) => {
    const guiApi = Api.create(tool);

    program
        .command('gui [paths...]')
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

function runGui(args) {
    server.start(args).then(({url}) => {
        logger.log(`GUI is running at ${chalk.cyan(url)}`);
        args.configs.options.open && opener(url);
    }).done();
}
