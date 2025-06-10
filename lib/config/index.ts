import _ from 'lodash';
import {root, section, option} from 'gemini-configparser';
import chalk from 'chalk';

import {logger} from '../common-utils';
import {configDefaults, DiffModeId, DiffModes, SaveFormat, ViewMode} from '../constants';
import {assertCustomGui} from './custom-gui-asserts';
import {ErrorPattern, PluginDescription, ReporterConfig, ReporterOptions} from '../types';
import {UiMode} from '../constants/local-storage';

const ENV_PREFIX = 'html_reporter_';
const CLI_PREFIX = '--html-reporter-';

const ALLOWED_PLUGIN_DESCRIPTION_FIELDS = new Set(['name', 'component', 'point', 'position', 'config']);

type TypePredicateFn<T> = (value: unknown) => value is T;
type AssertionFn<T> = (value: unknown) => asserts value is T;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    return _.isPlainObject(value);
};

const assertType = <T>(name: string, validationFn: (value: unknown) => value is T, type: string): AssertionFn<T> => {
    return (v: unknown): asserts v is T => {
        if (!validationFn(v)) {
            throw new Error(`"${name}" option must be ${type}, but got ${typeof v}`);
        }
    };
};
const assertString = (name: string): AssertionFn<string> => assertType(name, _.isString, 'string');
const assertBoolean = (name: string): AssertionFn<boolean> => assertType(name, _.isBoolean, 'boolean');
export const assertNumber = (name: string): AssertionFn<number> => assertType(name, _.isNumber, 'number');
const assertPlainObject = (name: string): AssertionFn<Record<string, unknown>> => assertType(name, isPlainObject, 'plain object');

const assertSaveFormat = (saveFormat: unknown): asserts saveFormat is SaveFormat => {
    const formats = Object.values(SaveFormat);
    if (!_.isString(saveFormat)) {
        throw new Error(`"saveFormat" option must be string, but got ${typeof saveFormat}`);
    }

    if (!formats.includes(saveFormat as SaveFormat)) {
        throw new Error(`"saveFormat" must be "${formats.join('", "')}", but got "${saveFormat}"`);
    }
};

const assertErrorPatterns = (errorPatterns: unknown): asserts errorPatterns is (string | ErrorPattern)[] => {
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

const assertMetaInfoBaseUrls = (metaInfoBaseUrls: unknown): asserts metaInfoBaseUrls is Record<string, string> => {
    if (!_.isObject(metaInfoBaseUrls)) {
        throw new Error(`"metaInfoBaseUrls" option must be object, but got ${typeof metaInfoBaseUrls}`);
    }
    for (const keyStr in metaInfoBaseUrls) {
        const key = keyStr as keyof typeof metaInfoBaseUrls;
        if (!_.isString(metaInfoBaseUrls[key])) {
            throw new Error(`Value of "${key}" in "metaInfoBaseUrls" option must be string, but got ${typeof metaInfoBaseUrls[key]}`);
        }
    }
};

const assertArrayOf = <T>(itemsType: string, name: string, predicateFn: TypePredicateFn<T>) => {
    return (value: unknown): asserts value is T[] => {
        if (!_.isArray(value)) {
            throw new Error(`"${name}" option must be an array, but got ${typeof value}`);
        }
        for (const item of value) {
            if (!predicateFn(item)) {
                throw new Error(`"${name}" option must be an array of ${itemsType} but got ${typeof item} for one of items`);
            }
        }
    };
};

const assertPluginDescription = (description: unknown): description is PluginDescription => {
    const maybeDescription = description as PluginDescription;

    if (!_.isPlainObject(maybeDescription)) {
        throw new Error(`plugin description expected to be an object but got ${typeof description}`);
    }

    for (const field of ['name', 'component'] as const) {
        if (!maybeDescription[field] || !_.isString(maybeDescription[field])) {
            throw new Error(`"plugins.${field}" option must be non-empty string but got ${typeof maybeDescription[field]}`);
        }
    }

    if (maybeDescription.point && !_.isString(maybeDescription.point)) {
        throw new Error(`"plugins.point" option must be string but got ${typeof maybeDescription.point}`);
    }

    if (maybeDescription.position && !['after', 'before', 'wrap'].includes(maybeDescription.position)) {
        throw new Error(`"plugins.position" option got an unexpected value "${maybeDescription.position}"`);
    }

    if (maybeDescription.config && !_.isPlainObject(maybeDescription.config)) {
        throw new Error(`plugin configuration expected to be an object but got ${typeof maybeDescription.config}`);
    }

    _.forOwn(description, (value, key) => {
        if (!ALLOWED_PLUGIN_DESCRIPTION_FIELDS.has(key)) {
            throw new Error(`a "plugins" item has unexpected field "${key}" of type ${typeof value}`);
        }
    });

    return true;
};

const assertDiffMode = (diffMode: unknown): asserts diffMode is DiffModeId => {
    if (!_.isString(diffMode)) {
        throw new Error(`"diffMode" option must be a string, but got ${typeof diffMode}`);
    }

    const availableValues = Object.values(DiffModes).map(v => v.id);

    if (!availableValues.includes(diffMode as DiffModeId)) {
        throw new Error(`"diffMode" must be one of "${availableValues.join('", "')}", but got "${diffMode}"`);
    }
};

const assertUiMode = (uiMode: unknown): asserts uiMode is UiMode | null => {
    if (uiMode === null) {
        return;
    }

    if (!_.isString(uiMode) || !Object.values(UiMode).includes(uiMode as UiMode)) {
        throw new Error(`"uiMode" must be one of "${Object.values(UiMode).join('", "')}", but got "${uiMode}"`);
    }
};

const mapErrorPatterns = (errorPatterns: (string | ErrorPattern)[]): ErrorPattern[] => {
    return errorPatterns.map(patternInfo => {
        return _.isString(patternInfo)
            ? {name: patternInfo, pattern: patternInfo}
            : patternInfo;
    });
};

const deprecationWarning = (name: string): void => {
    logger.warn(chalk.red(`Warning: field "${name}" is deprecated and will be removed soon from html-reporter config.`));
};

const getParser = (): ReturnType<typeof root<ReporterConfig>> => {
    return root<ReporterConfig>(section<ReporterConfig>({
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
            defaultValue: SaveFormat.SQLITE,
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
        defaultView: option<ViewMode>({
            defaultValue: configDefaults.defaultView,
            validate: assertString('defaultView')
        }),
        diffMode: option<DiffModeId>({
            defaultValue: configDefaults.diffMode,
            validate: assertDiffMode
        }),
        uiMode: option({
            defaultValue: configDefaults.uiMode,
            validate: assertUiMode
        }),
        baseHost: option({
            defaultValue: configDefaults.baseHost,
            validate: assertString('baseHost')
        }),
        lazyLoadOffset: option({
            defaultValue: configDefaults.lazyLoadOffset,
            validate: (value) => _.isNull(value) || deprecationWarning('lazyLoadOffset')
        }),
        errorPatterns: option<(string | ErrorPattern)[], ErrorPattern[]>({
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
        customScripts: option<(() => void)[]>({
            defaultValue: configDefaults.customScripts,
            validate: assertArrayOf('functions', 'customScripts', _.isFunction)
        }),
        yandexMetrika: section({
            enabled: option({
                defaultValue: () => {
                    return !(process.env.NO_ANALYTICS && JSON.parse(process.env.NO_ANALYTICS));
                },
                parseEnv: JSON.parse,
                parseCli: JSON.parse,
                validate: assertBoolean('yandexMetrika.enabled'),
                map: (value: boolean) => {
                    if (process.env.NO_ANALYTICS && JSON.parse(process.env.NO_ANALYTICS)) {
                        return false;
                    }

                    return value;
                }
            }),
            counterNumber: option({
                isDeprecated: true,
                defaultValue: configDefaults.yandexMetrika.counterNumber,
                parseEnv: Number,
                parseCli: Number,
                map: () => configDefaults.yandexMetrika.counterNumber
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
        }),
        staticImageAccepter: section({
            enabled: option({
                defaultValue: configDefaults.staticImageAccepter.enabled,
                parseEnv: JSON.parse,
                parseCli: JSON.parse,
                validate: assertBoolean('staticImageAccepter.enabled')
            }),
            repositoryUrl: option({
                defaultValue: configDefaults.staticImageAccepter.repositoryUrl,
                validate: assertString('staticImageAccepter.repositoryUrl')
            }),
            pullRequestUrl: option({
                defaultValue: configDefaults.staticImageAccepter.pullRequestUrl,
                validate: assertString('staticImageAccepter.pullRequestUrl')
            }),
            serviceUrl: option({
                defaultValue: configDefaults.staticImageAccepter.serviceUrl,
                validate: assertString('staticImageAccepter.serviceUrl')
            }),
            meta: option({
                defaultValue: configDefaults.staticImageAccepter.meta,
                parseEnv: JSON.parse,
                parseCli: JSON.parse,
                validate: assertPlainObject('staticImageAccepter.meta')
            }),
            axiosRequestOptions: option({
                defaultValue: configDefaults.staticImageAccepter.axiosRequestOptions,
                parseEnv: JSON.parse,
                parseCli: JSON.parse,
                validate: assertPlainObject('staticImageAccepter.axiosRequestOptions')
            })
        })
    }), {envPrefix: ENV_PREFIX, cliPrefix: CLI_PREFIX});
};

export const parseConfig = (options: Partial<ReporterOptions>): ReporterConfig => {
    const env = process.env;
    const argv = process.argv;

    // TODO: add support for different types of input and output in gemini-configparser
    return getParser()({options: options as ReporterConfig, env, argv});
};
