'use strict';

const _ = require('lodash');
const configParser = require('gemini-configparser');
const chalk = require('chalk');

const {logger} = require('../common-utils');
const {config: configDefaults} = require('../constants/defaults');
const diffModes = require('../constants/diff-modes');
const saveFormats = require('../constants/save-formats');
const {assertCustomGui} = require('./custom-gui-asserts');

const root = configParser.root;
const section = configParser.section;
const option = configParser.option;

const ENV_PREFIX = 'html_reporter_';
const CLI_PREFIX = '--html-reporter-';

const ALLOWED_PLUGIN_DESCRIPTION_FIELDS = new Set(['name', 'component', 'point', 'position', 'config']);

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

const assertSaveFormat = saveFormat => {
    const formats = Object.values(saveFormats);
    if (!_.isString(saveFormat)) {
        throw new Error(`"saveFormat" option must be string, but got ${typeof saveFormat}`);
    }

    if (!formats.includes(saveFormat)) {
        throw new Error(`"saveFormat" must be "${formats.join('", "')}", but got "${saveFormat}"`);
    }
};

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

const assertMetaInfoBaseUrls = (metaInfoBaseUrls) => {
    if (!_.isObject(metaInfoBaseUrls)) {
        throw new Error(`"metaInfoBaseUrls" option must be object, but got ${typeof metaInfoBaseUrls}`);
    }
    for (const key in metaInfoBaseUrls) {
        if (!_.isString(metaInfoBaseUrls[key])) {
            throw new Error(`Value of "${key}" in "metaInfoBaseUrls" option must be string, but got ${typeof metaInfoBaseUrls[key]}`);
        }
    }
};

const assertArrayOf = (itemsType, name, assertFn) => {
    return (value) => {
        if (!_.isArray(value)) {
            throw new Error(`"${name}" option must be an array, but got ${typeof value}`);
        }
        for (const item of value) {
            if (!assertFn(item)) {
                throw new Error(`"${name}" option must be an array of ${itemsType} but got ${typeof item} for one of items`);
            }
        }
    };
};

const assertPluginDescription = (description) => {
    if (!_.isPlainObject(description)) {
        throw new Error(`plugin description expected to be an object but got ${typeof description}`);
    }

    for (const field of ['name', 'component']) {
        if (!description[field] || !_.isString(description[field])) {
            throw new Error(`"plugins.${field}" option must be non-empty string but got ${typeof description[field]}`);
        }
    }

    if (description.point && !_.isString(description.point)) {
        throw new Error(`"plugins.point" option must be string but got ${typeof description.point}`);
    }

    if (description.position && !['after', 'before', 'wrap'].includes(description.position)) {
        throw new Error(`"plugins.position" option got an unexpected value "${description.position}"`);
    }

    if (description.config && !_.isPlainObject(description.config)) {
        throw new Error(`plugin configuration expected to be an object but got ${typeof description.config}`);
    }

    _.forOwn(description, (value, key) => {
        if (!ALLOWED_PLUGIN_DESCRIPTION_FIELDS.has(key)) {
            throw new Error(`a "plugins" item has unexpected field "${key}" of type ${typeof value}`);
        }
    });

    return true;
};

const assertDiffMode = (diffMode) => {
    if (!_.isString(diffMode)) {
        throw new Error(`"diffMode" option must be a string, but got ${typeof diffMode}`);
    }

    const availableValues = Object.values(diffModes).map(v => v.id);

    if (!availableValues.includes(diffMode)) {
        throw new Error(`"diffMode" must be one of "${availableValues.join('", "')}", but got "${diffMode}"`);
    }
};

const mapErrorPatterns = (errorPatterns) => {
    return errorPatterns.map(patternInfo => {
        return _.isString(patternInfo)
            ? {name: patternInfo, pattern: patternInfo}
            : patternInfo;
    });
};

const deprecationWarning = (name) => {
    logger.warn(chalk.red(`Warning: field "${name}" is deprecated and will be removed soon from html-reporter config.`));
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
        saveFormat: option({
            defaultValue: saveFormats.SQLITE,
            validate: assertSaveFormat
        }),
        saveErrorDetails: option({
            defaultValue: false,
            parseEnv: JSON.parse,
            parseCli: JSON.parse,
            validate: assertBoolean('saveErrorDetails')
        }),
        commandsWithShortHistory: option({
            defaultValue: configDefaults.commandsWithShortHistory,
            validate: assertArrayOf('strings', 'commandsWithShortHistory', _.isString)
        }),
        defaultView: option({
            defaultValue: configDefaults.defaultView,
            validate: assertString('defaultView')
        }),
        diffMode: option({
            defaultValue: configDefaults.diffMode,
            validate: assertDiffMode
        }),
        baseHost: option({
            defaultValue: configDefaults.baseHost,
            validate: assertString('baseHost')
        }),
        lazyLoadOffset: option({
            defaultValue: configDefaults.lazyLoadOffset,
            validate: (value) => _.isNull(value) || deprecationWarning('lazyLoadOffset')
        }),
        errorPatterns: option({
            defaultValue: configDefaults.errorPatterns,
            parseEnv: JSON.parse,
            validate: assertErrorPatterns,
            map: mapErrorPatterns
        }),
        metaInfoBaseUrls: option({
            defaultValue: configDefaults.metaInfoBaseUrls,
            parseEnv: JSON.parse,
            parseCli: JSON.parse,
            validate: assertMetaInfoBaseUrls
        }),
        customGui: option({
            defaultValue: configDefaults.customGui,
            validate: assertCustomGui
        }),
        customScripts: option({
            defaultValue: configDefaults.customScripts,
            validate: assertArrayOf('functions', 'customScripts', _.isFunction)
        }),
        yandexMetrika: section({
            counterNumber: option({
                defaultValue: configDefaults.yandexMetrika.counterNumber,
                parseEnv: Number,
                parseCli: Number,
                validate: (value) => _.isNull(value) || assertNumber('yandexMetrika.counterNumber')(value)
            })
        }),
        pluginsEnabled: option({
            defaultValue: configDefaults.pluginsEnabled,
            parseEnv: JSON.parse,
            parseCli: JSON.parse,
            validate: assertBoolean('pluginsEnabled')
        }),
        plugins: option({
            defaultValue: configDefaults.plugins,
            parseEnv: JSON.parse,
            parseCli: JSON.parse,
            validate: assertArrayOf('plugin descriptions', 'plugins', assertPluginDescription)
        })
    }), {envPrefix: ENV_PREFIX, cliPrefix: CLI_PREFIX});
};

module.exports = (options) => {
    const env = process.env;
    const argv = process.argv;

    return getParser()({options, env, argv});
};
