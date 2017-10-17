'use strict';

const _ = require('lodash');
const configParser = require('gemini-configparser');

const root = configParser.root;
const section = configParser.section;
const option = configParser.option;

const ENV_PREFIX = 'html_reporter_';
const CLI_PREFIX = '--html-reporter-';

const getParser = () => {
    return root(section({
        enabled: option({
            defaultValue: true,
            parseEnv: JSON.parse,
            validate: _.isBoolean
        }),
        path: option({
            defaultValue: 'gemini-report',
            validate: _.isString
        }),
        defaultView: option({
            defaultValue: 'all',
            validate: _.isString
        }),
        baseHost: option({
            defaultValue: '',
            validate: _.isString
        })
    }), {envPrefix: ENV_PREFIX, cliPrefix: CLI_PREFIX});
};

module.exports = (options) => {
    const env = process.env;
    const argv = process.argv;

    return getParser()({options, env, argv});
};
