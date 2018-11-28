'use strict';
var chalk = require('chalk');
var opener = require('opener');
var server = require('./server');
var _a = require('../server-utils'), logger = _a.logger, logError = _a.logError;
module.exports = function (args) {
    server.start(args)
        .then(function (_a) {
        var url = _a.url;
        logger.log("GUI is running at " + chalk.cyan(url));
        args.configs.options.open && opener(url);
    })
        .catch(function (err) {
        logError(err);
        process.exit(1);
    });
};
//# sourceMappingURL=index.js.map