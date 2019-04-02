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

const assertErrorPatterns = (errorPatterns) => {
    if (!_.isArray(errorPatterns)) {
        throw new Error(`"errorPatterns" option must be array, but got ${typeof errorPatterns}`);
    }
    for (const patternInfo of errorPatterns) {
        if (!_.isString(patternInfo) && !_.isPlainObject(patternInfo)) {
            throw new Error(`Element of "errorPatterns" option must be plain object or string, but got ${typeof patternInfo}`);
        }
        if (_.isPlainObject(patternInfo)) {
            for (const field of ['name', 'pattern']) {
                if (!_.isString(patternInfo[field])) {
                    throw new Error(`Field "${field}" in element of "errorPatterns" option must be string, but got ${typeof patternInfo[field]}`);
                }
            }
        }
    }
};

const mapErrorPatterns = (errorPatterns) => {
    return errorPatterns.map(patternInfo => {
        if (typeof patternInfo === 'string') {
            return {
                name: patternInfo,
                pattern: patternInfo
            };
        }
        return patternInfo;
    });
};

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
        }),
        errorPatterns: option({
            defaultValue: configDefaults.errorPatterns,
            parseEnv: JSON.parse,
            validate: assertErrorPatterns,
            map: mapErrorPatterns
        })
    }), {envPrefix: ENV_PREFIX, cliPrefix: CLI_PREFIX});
};

module.exports = (options) => {
    const env = process.env;
    const argv = process.argv;

    return getParser()({options, env, argv});
};
