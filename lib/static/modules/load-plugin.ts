import React from 'react';
import * as Redux from 'redux';
import * as ReactRedux from 'react-redux';
import _ from 'lodash';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import * as SemanticUIReact from 'semantic-ui-react';
import ReactMarkdown from 'react-markdown';
import reduceReducers from 'reduce-reducers';
import immer from 'immer';
import * as reselect from 'reselect';
import axios from 'axios';
import * as selectors from './selectors';
import actionNames from './action-names';
import Details from '../components/details';

const whitelistedDeps = {
    'react': React,
    'redux': Redux,
    'react-redux': ReactRedux,
    'lodash': _,
    'prop-types': PropTypes,
    'classnames': classNames,
    'semantic-ui-react': SemanticUIReact,
    'react-markdown': ReactMarkdown,
    'reduce-reducers': reduceReducers,
    'immer': immer,
    'reselect': reselect,
    'axios': axios,
    'components': {
        Details
    }
};

type WhitelistedDeps = typeof whitelistedDeps;
type WhitelistedDepName = keyof WhitelistedDeps;
type WhitelistedDep = typeof whitelistedDeps[WhitelistedDepName];

// Branded string
type ScriptText = string & {__script_text__: never};

type UnknownRecord = {[key: string]: unknown}
export type InstalledPlugin = UnknownRecord
export type PluginConfig = UnknownRecord

interface PluginOptions {
    pluginName: string;
    pluginConfig: PluginConfig;
    actions: typeof import('./actions');
    actionNames: typeof actionNames;
    selectors: typeof selectors;
}

type PluginFunction = (args: [...WhitelistedDep[], PluginOptions]) => InstalledPlugin

type ModuleWithDefaultFunction = {default: PluginFunction};

type CompiledPluginWithDeps = [...WhitelistedDepName[], PluginFunction];
type CompiledPlugin = InstalledPlugin | ModuleWithDefaultFunction | PluginFunction | CompiledPluginWithDeps

// It's expected that in the plugin code there is a
// __testplane_html_reporter_register_plugin__ call,
// with actual plugin passed.
// Such a plugin may be created by using the following webpack config:
//   ```
//     output: { libraryTarget: 'jsonp', library: '__testplane_html_reporter_register_plugin__' }
//   ```
// or with a call to the function in the plugin code directly.
//
// The plugin is one of:
// - an object with arbitrary keys containing exported components
//   and optional `reducers` key - array of reducer functions
//   that will be combined by reduceReducers later
// - a function returning such a plugin
// - an array with the string list of required dependencies and a function as the last item.
//   The function will be called with the dependencies as arguments plus `options` arg.

const loadingPlugins: Record<string, Promise<ScriptText> | undefined> = {};
const pendingPlugins: Record<string, Promise<InstalledPlugin | undefined> | undefined> = {};
export function preloadPlugin(pluginName: string): void {
    loadingPlugins[pluginName] = loadingPlugins[pluginName] || getScriptText(pluginName);
}

export async function loadPlugin(pluginName: string, pluginConfig: PluginConfig): Promise<InstalledPlugin | undefined> {
    if (pendingPlugins[pluginName]) {
        return pendingPlugins[pluginName];
    }

    const scriptTextPromise = loadingPlugins[pluginName] || getScriptText(pluginName);

    return pendingPlugins[pluginName] = scriptTextPromise
        .then(compilePlugin)
        .then(plugin => initPlugin(plugin, pluginName, pluginConfig))
        .catch(err => {
            console.error(`Plugin "${pluginName}" failed to load.`, err);
            return undefined;
        });
}

const hasDefault = (plugin: CompiledPlugin): plugin is ModuleWithDefaultFunction =>
    _.isObject(plugin) && !_.isArray(plugin) && !_.isFunction(plugin) && _.isFunction(plugin.default);

const getDeps = (pluginWithDeps: CompiledPluginWithDeps): WhitelistedDepName[] => pluginWithDeps.slice(0, -1) as WhitelistedDepName[];
const getPluginFn = (pluginWithDeps: CompiledPluginWithDeps): PluginFunction => _.last(pluginWithDeps) as PluginFunction;

async function initPlugin(plugin: CompiledPlugin, pluginName: string, pluginConfig: PluginConfig): Promise<InstalledPlugin | undefined> {
    try {
        if (!_.isObject(plugin)) {
            return undefined;
        }

        plugin = hasDefault(plugin) ? plugin.default : plugin;

        if (typeof plugin === 'function') {
            plugin = [plugin];
        }

        if (Array.isArray(plugin)) {
            const deps = getDeps(plugin);

            const pluginFn = getPluginFn(plugin);

            const depArgs = deps.map(dep => whitelistedDeps[dep]);

            // cyclic dep, resolve it dynamically
            const actions = await import('./actions');

            // @ts-expect-error Unfortunately, for historical reasons
            // the order of arguments and their types are not amenable to normal typing, so we will have to ignore the error here.
            return pluginFn(...depArgs, {pluginName, pluginConfig, actions, actionNames, selectors});
        }

        return plugin;
    } catch (err) {
        console.error(`Error on "${pluginName}" plugin initialization:`, err);
        return undefined;
    }
}

// Actual plugin is passed to __testplane_html_reporter_register_plugin__ somewhere in the
// plugin code
function compilePlugin(code: ScriptText): CompiledPlugin {
    const exec = new Function(`${getRegisterFn('testplane')} ${getRegisterFn('hermione')} return ${code};`);

    return exec();
}

async function getScriptText(pluginName: string): Promise<ScriptText> {
    const scriptUrl = getPluginScriptPath(pluginName);
    const {data} = await axios.get(scriptUrl);

    return data;
}

function getRegisterFn(tool: string): string {
    return `function __${tool}_html_reporter_register_plugin__(p) {return p;};`;
}

function getPluginScriptPath(pluginName: string): string {
    return `plugins/${encodeURIComponent(pluginName)}/plugin.js`;
}
