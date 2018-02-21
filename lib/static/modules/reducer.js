'use strict';

import url from 'url';
import actionNames from './action-names';
import defaultState from './default-state';
import {merge, filter, cloneDeep} from 'lodash';
import {hasFails, setStatusToAll, findNode, setStatusForBranch} from './utils';

const compiledData = window.data || defaultState;
const localStorage = window.localStorage;

function getInitialState(compiledData) {
    const {skips, suites, config, total, updated, passed,
        failed, skipped, warned, retries, gui = false} = compiledData;

    return merge(defaultState, {
        gui,
        skips,
        suites: {
            all: suites.all || suites,
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

export default function reducer(state = getInitialState(compiledData), action) {
    switch (action.type) {
        case actionNames.RUN_ALL_TESTS: {
            const suites = cloneDeep(state.suites.all);
            setStatusToAll(suites, action.payload.status);

            return merge({}, state, {suites: {all: suites}});
        }
        case actionNames.VIEW_INITIAL: {
            const {gui, suites} = action.payload;

            return merge({}, state, {gui, suites: {all: suites}}); // rewrite store on init
        }
        case actionNames.SUITE_BEGIN: {
            const suites = cloneDeep(state.suites.all);
            const {suitePath, status} = action.payload;
            const test = findNode(suites, suitePath);
            test && (test.status = status);

            return merge({}, state, {suites: {all: suites}});
        }
        case actionNames.TEST_BEGIN: {
            const suites = cloneDeep(state.suites.all);
            const {name, suitePath, status, browserId} = action.payload;
            const test = findNode(suites, suitePath.concat(name));
            if (test) {
                test.status = status;
                test.browsers.forEach((b) => {
                    if (b.name === browserId) {
                        b.result.status = status;
                    }
                });
            }

            return merge({}, state, {suites: {all: suites}});
        }
        case actionNames.TEST_RESULT: {
            const suites = cloneDeep(state.suites.all);
            const {suitePath, browserResult, browserId} = action.payload;
            const test = findNode(suites, suitePath);

            if (test) {
                test.browsers.forEach((b) => {
                    if (b.name === browserId) {
                        Object.assign(b, browserResult);
                    }
                });
                setStatusForBranch(suites, suitePath, browserResult.result.status);
            }

            return merge({}, state, {suites: {all: suites}});
        }
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
