'use strict';

const chalk = require('chalk');
const opener = require('opener');
const server = require('./server');

const collect = (newValue, array = []) => array.concat(newValue);

module.exports = (program, tool, pluginConfig) => {
    program
        .command('gui [paths...]')
        .allowUnknownOption()
        .description('update the changed screenshots or gather them if they does not exist')
        .option('-p, --port <port>', 'Port to launch server on', 8000)
        .option('--hostname <hostname>', 'Hostname to launch server on', 'localhost')
        .option('-s, --set <set>', 'set to run', collect)
        .option('-a, --auto-run', 'auto run immediately')
        .option('-O, --no-open', 'not to open a browser window after starting the server')
        .action((paths, options) => {
            return runGui(paths, tool, {options, program, pluginConfig});
        });
};

function runGui(paths, tool, configs) {
    console.warn(chalk.red('Be careful! This functionality is still under development!'));
    server.start(paths, tool, configs).then(({url}) => {
        console.log(`GUI is running at ${chalk.cyan(url)}`);
        if (configs.options.open) {
            opener(url);
        }
    }).done();
}
