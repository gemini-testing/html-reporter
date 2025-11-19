import React from 'react';
import ReactDOM from 'react-dom';
import * as JSXRuntime from 'react/jsx-runtime';
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
import * as GravityUI from '@gravity-ui/uikit';
import * as GravityUIIcons from '@gravity-ui/icons';
import * as pluginsSDKUI from './plugins-sdk-ui';
import * as selectors from './selectors';
import actionNames from './action-names';
import Details from '../components/details';
import {getPluginMiddlewareRoute} from '@/static/modules/utils/pluginMiddlewareRoute';

const whitelistedDeps = {
    'react': React,
    'react/jsx-runtime': JSXRuntime,
    'react-dom': ReactDOM,
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
    '@gravity-ui/uikit': GravityUI,
    '@gravity-ui/icons': GravityUIIcons,
    'html-reporter/plugins-sdk/ui': pluginsSDKUI,
    'components': {
        Details
    }
};

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

const loadingPlugins = {};
const pendingPlugins = {};

const getPluginScriptPath = pluginName => `plugins/${encodeURIComponent(pluginName)}/plugin.js`;

export function preloadPlugin(pluginName) {
    loadingPlugins[pluginName] = loadingPlugins[pluginName] || getScriptText(pluginName);
}

export async function loadPlugin(pluginName, pluginConfig) {
    if (pendingPlugins[pluginName]) {
        return pendingPlugins[pluginName];
    }

    const scriptTextPromise = loadingPlugins[pluginName] || getScriptText(pluginName);

    return pendingPlugins[pluginName] = scriptTextPromise
        .then(executePluginCode)
        .then(plugin => initPlugin(plugin, pluginName, pluginConfig))
        .then(null, err => {
            console.error(`Plugin "${pluginName}" failed to load.`, err);
            return null;
        });
}

async function initPlugin(plugin, pluginName, pluginConfig) {
    try {
        if (!_.isObject(plugin)) {
            return null;
        }

        plugin = plugin.default || plugin;

        if (typeof plugin === 'function') {
            plugin = [plugin];
        }

        if (Array.isArray(plugin)) {
            const deps = plugin.slice(0, -1);
            plugin = _.last(plugin);
            const depArgs = deps.map(dep => whitelistedDeps[dep]);
            // cyclic dep, resolve it dynamically
            const actionsModule = await import('./actions');
            const actions = actionsModule.default || actionsModule;
            return plugin(...depArgs, {
                pluginName,
                pluginConfig,
                actions,
                actionNames,
                selectors,
                pluginServerEndpointPrefix: getPluginMiddlewareRoute(pluginName)
            });
        }

        return plugin;
    } catch (err) {
        console.error(`Error on "${pluginName}" plugin initialization:`, err);
        return null;
    }
}

// Actual plugin is passed to __testplane_html_reporter_register_plugin__ somewhere in the
// plugin code
function executePluginCode(code) {
    const getRegisterFn = tool => `function __${tool}_html_reporter_register_plugin__(p) {return p;};`;

    const exec = new Function(`${getRegisterFn('testplane')} ${getRegisterFn('hermione')} return ${code};`);

    return exec();
}

async function getScriptText(pluginName) {
    const scriptUrl = getPluginScriptPath(pluginName);
    const {data} = await axios.get(scriptUrl);

    return data;
}
