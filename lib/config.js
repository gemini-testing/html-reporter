'use strict';

const _ = require('lodash');
const configParser = require('gemini-configparser');

const root = configParser.root;
const section = configParser.section;
const option = configParser.option;

const ENV_PREFIX = 'html_reporter_';
const CLI_PREFIX = '--html-reporter-';

const isString = (name) => {
    return (v) => {
        if (!_.isString(v)) {
            throw new Error(`"${name}" option must be string, but got ${typeof v}`);
        }
    };
};

const getParser = () => {
    return root(section({
        enabled: option({
            defaultValue: true,
            parseEnv: JSON.parse,
            parseCli: JSON.parse,
            validate: (v) => {
                if (!_.isBoolean(v)) {
                    throw new Error(`"enabled" option must be boolean, but got ${typeof v}`);
                }
            }
        }),
        screenshotOnReject: option({
            defaultValue: true,
            parseEnv: JSON.parse,
            parseCli: JSON.parse,
            validate: (v) => {
                if (!_.isBoolean(v) && !_.isPlainObject(v)) {
                    throw new Error(`"screenshotOnReject" option must be boolean or plain object, but got ${typeof v}`);
                }
            }
        }),
        path: option({
            defaultValue: 'html-report',
            validate: isString('path')
        }),
        defaultView: option({
            defaultValue: 'all',
            validate: isString('defaultView')
        }),
        baseHost: option({
            defaultValue: '',
            validate: isString('baseHost')
        })
    }), {envPrefix: ENV_PREFIX, cliPrefix: CLI_PREFIX});
};

module.exports = (options) => {
    const env = process.env;
    const argv = process.argv;

    return getParser()({options, env, argv});
};
