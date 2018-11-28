'use strict';
var _ = require('lodash');
var configParser = require('gemini-configparser');
var root = configParser.root;
var section = configParser.section;
var option = configParser.option;
var ENV_PREFIX = 'html_reporter_';
var CLI_PREFIX = '--html-reporter-';
var configDefaults = require('./constants/defaults').config;
var assertType = function (name, validationFn, type) {
    return function (v) {
        if (!validationFn(v)) {
            throw new Error("\"" + name + "\" option must be " + type + ", but got " + typeof v);
        }
    };
};
var assertString = function (name) { return assertType(name, _.isString, 'string'); };
var assertBoolean = function (name) { return assertType(name, _.isBoolean, 'boolean'); };
var assertNumber = function (name) { return assertType(name, _.isNumber, 'number'); };
var getParser = function () {
    return root(section({
        enabled: option({
            defaultValue: true,
            parseEnv: JSON.parse,
            parseCli: JSON.parse,
            validate: assertBoolean('enabled')
        }),
        path: option({
            defaultValue: 'html-report',
            validate: assertString('path')
        }),
        defaultView: option({
            defaultValue: configDefaults.defaultView,
            validate: assertString('defaultView')
        }),
        baseHost: option({
            defaultValue: configDefaults.baseHost,
            validate: assertString('baseHost')
        }),
        scaleImages: option({
            defaultValue: configDefaults.scaleImages,
            parseEnv: JSON.parse,
            parseCli: JSON.parse,
            validate: assertBoolean('scaleImages')
        }),
        lazyLoadOffset: option({
            defaultValue: configDefaults.lazyLoadOffset,
            parseEnv: JSON.parse,
            validate: assertNumber('lazyLoadOffset')
        })
    }), { envPrefix: ENV_PREFIX, cliPrefix: CLI_PREFIX });
};
module.exports = function (options) {
    var env = process.env;
    var argv = process.argv;
    return getParser()({ options: options, env: env, argv: argv });
};
//# sourceMappingURL=config.js.map