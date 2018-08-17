'use strict';

const chalk = require('chalk');
const opener = require('opener');
const server = require('./server');
const {logger, logError} = require('../server-utils');

module.exports = (args) => {
    server.start(args)
        .then(({url}) => {
            logger.log(`GUI is running at ${chalk.cyan(url)}`);
            args.configs.options.open && opener(url);
        })
        .catch((err) => {
            logError(err);
            process.exit(1);
        });
};
