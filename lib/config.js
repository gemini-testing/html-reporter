'use strict';

const _ = require('lodash');
const configParser = require('gemini-configparser');

const root = configParser.root;
const section = configParser.section;
const option = configParser.option;

const ENV_PREFIX = 'html_reporter_';
const CLI_PREFIX = '--html-reporter-';

const {config: configDefaults} = require('./constants/defaults');

const assertType = (name, validationFn, type) => {
    return (v) => {
        if (!validationFn(v)) {
            throw new Error(`"${name}" option must be ${type}, but got ${typeof v}`);
        }
    };
};
const assertString = (name) => assertType(name, _.isString, 'string');
const assertBoolean = (name) => assertType(name, _.isBoolean, 'boolean');
const assertNumber = (name) => assertType(name, _.isNumber, 'number');

const getParser = () => {
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
    }), {envPrefix: ENV_PREFIX, cliPrefix: CLI_PREFIX});
};

module.exports = (options) => {
    const env = process.env;
    const argv = process.argv;

    return getParser()({options, env, argv});
};
