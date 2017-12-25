'use strict';

import url from 'url';
import {createStore, applyMiddleware, compose} from 'redux';
import logger from 'redux-logger';
import {merge, filter, cloneDeep} from 'lodash';
import actionNames from './action-names';
import defaultState from './default-state';
import {hasFails} from './utils';

const middlewares = [];

if (process.env.NODE_ENV !== 'production') {
    middlewares.push(logger);
}

const compiledData = window.data;
const localStorage = window.localStorage;

function getInitialState(compiledData) {
    const {skips, suites, config, total, updated, passed,
        failed, skipped, warned, retries} = compiledData;

    return merge(defaultState, {
        skips,
        suites: {
            all: suites,
            failed: cloneDeep(filter(suites, hasFails))
        },
        config,
        stats: {total, updated, passed, failed, skipped, retries, warned},
        view: {
            viewMode: config.defaultView,
            ..._loadBaseHost(config.baseHost, localStorage)
        }
    });
}

function reducer(state = getInitialState(compiledData), action) {
    switch (action.type) {
        case actionNames.VIEW_EXPAND_ALL: {
            return merge({}, state, {view: {expand: 'all'}});
        }
        case actionNames.VIEW_EXPAND_ERRORS: {
            return merge({}, state, {view: {expand: 'errors'}});
        }
        case actionNames.VIEW_COLLAPSE_ALL: {
            return merge({}, state, {view: {expand: 'none'}});
        }
        case actionNames.VIEW_SHOW_ALL: {
            return merge({}, state, {view: {viewMode: 'all', expand: 'errors'}});
        }
        case actionNames.VIEW_SHOW_FAILED: {
            return merge({}, state, {view: {viewMode: 'failed', expand: 'errors'}});
        }
        case actionNames.VIEW_TOGGLE_SKIPPED: {
            return merge({}, state, {view: {showSkipped: !state.view.showSkipped}});
        }
        case actionNames.VIEW_TOGGLE_RETRIES: {
            return merge({}, state, {view: {showRetries: !state.view.showRetries}});
        }
        case actionNames.VIEW_TOGGLE_ONLY_DIFF: {
            return merge({}, state, {view: {showOnlyDiff: !state.view.showOnlyDiff}});
        }
        case actionNames.VIEW_UPDATE_BASE_HOST: {
            const baseHost = action.host;

            return merge({}, state, {
                view: {
                    baseHost,
                    parsedHost: _parseHost(baseHost)
                }
            });
        }
        default:
            return state;
    }
}

function _loadBaseHost(configuredHost, storage) {
    if (!storage) {
        return configuredHost;
    }

    const storageHost = storage.getItem('_gemini-replace-host');
    const baseHost = storageHost || configuredHost;
    const parsedHost = _parseHost(baseHost);

    return {baseHost, parsedHost};
}

function _parseHost(baseHost) {
    const parsedHost = url.parse(baseHost, false, true);
    return {
        host: parsedHost.slashes ? parsedHost.host : baseHost,
        protocol: parsedHost.slashes ? parsedHost.protocol : null,
        hostname: null,
        port: null
    };
}

export default compose(applyMiddleware(...middlewares))(createStore)(reducer);
