'use strict';

import url from 'url';
import actionNames from './action-names';
import defaultState from './default-state';
import {assign, merge, filter, map, clone, cloneDeep, isArray} from 'lodash';
import {isSuiteFailed, setStatusToAll, findNode, setStatusForBranch} from './utils';

const compiledData = window.data || defaultState;
const localStorage = window.localStorage;

function getInitialState(compiledData) {
    const {skips, suites, config, total, updated, passed,
        failed, skipped, warned, retries, gui = false} = compiledData;

    return merge(defaultState, {
        gui,
        skips,
        suites,
        suiteIds: {
            all: getSuitesIds(suites),
            failed: getFailedSuitesIds(suites)
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
        case actionNames.VIEW_INITIAL: {
            const {gui, autoRun, suites, skips} = action.payload;

            return merge({}, state, {
                gui,
                autoRun,
                skips,
                suites: suites.reduce((acc, s) => {
                    acc[getSuiteId(s)] = s;
                    return acc;
                }, {}),
                suiteIds: {
                    all: getSuitesIds(suites),
                    failed: getFailedSuitesIds(suites)
                }
            });
        }
        case actionNames.RUN_ALL_TESTS: {
            const suites = clone(state.suites);
            setStatusToAll(suites, action.payload.status);

            return merge({}, state, {running: true, suites: {all: suites}}); // TODO: rewrite store on run all tests
        }
        case actionNames.RUN_FAILED_TESTS: {
            return assign(clone(state), {running: true});
        }
        case actionNames.SUITE_BEGIN: {
            const suites = clone(state.suites);
            const {suitePath, status} = action.payload;
            const test = findNode(suites, suitePath);
            test && (test.status = status);

            return merge({}, state, {suites});
        }
        case actionNames.TEST_BEGIN: {
            const suites = clone(state.suites);
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

            return merge({}, state, {suites});
        }
        case actionNames.TESTS_END: {
            return assign(clone(state), {running: false});
        }
        case actionNames.TEST_RESULT: {
            return addTestResult(state, action);
        }
        case actionNames.UPDATE_RESULT: {
            return addTestResult(state, action);
        }
        case actionNames.VIEW_EXPAND_ALL: {
            return _mutateStateView(state, {expand: 'all'});
        }
        case actionNames.VIEW_EXPAND_ERRORS: {
            return _mutateStateView(state, {expand: 'errors'});
        }
        case actionNames.VIEW_COLLAPSE_ALL: {
            return _mutateStateView(state, {expand: 'none'});
        }
        case actionNames.VIEW_SHOW_ALL: {
            return _mutateStateView(state, {viewMode: 'all', expand: 'errors'});
        }
        case actionNames.VIEW_SHOW_FAILED: {
            return _mutateStateView(state, {viewMode: 'failed', expand: 'errors'});
        }
        case actionNames.VIEW_TOGGLE_SKIPPED: {
            return _mutateStateView(state, {showSkipped: !state.view.showSkipped});
        }
        case actionNames.VIEW_TOGGLE_RETRIES: {
            return _mutateStateView(state, {showRetries: !state.view.showRetries});
        }
        case actionNames.VIEW_TOGGLE_ONLY_DIFF: {
            return _mutateStateView(state, {showOnlyDiff: !state.view.showOnlyDiff});
        }
        case actionNames.VIEW_TOGGLE_SCALE_IMAGES: {
            return _mutateStateView(state, {scaleImages: !state.view.scaleImages});
        }
        case actionNames.VIEW_UPDATE_BASE_HOST: {
            const baseHost = action.host;
            const parsedHost = _parseHost(baseHost);

            return _mutateStateView(state, {baseHost, parsedHost});
        }
        default:
            return state;
    }
}

function addTestResult(state, action) {
    const suites = clone(state.suites);
    if (isArray(action.payload)) {
        action.payload.forEach((a) => {
            const {suitePath, browserResult, browserId} = a;
            const test = findNode(suites, suitePath);

            if (test) {
                test.browsers.forEach((b) => {
                    if (b.name === browserId) {
                        Object.assign(b, browserResult);
                    }
                });
                setStatusForBranch(suites, suitePath, browserResult.result.status);

                // Cloning suite to update it in tree
                const id = getSuiteId(test);
                suites[id] = cloneDeep(suites[id]);
            }
        });
    }

    const suiteIds = {failed: getFailedSuitesIds(suites)};
    const res = assign({}, state, suiteIds, {suites});

    return res;
}

function _mutateStateView(state, mutation) {
    const newView = clone(state.view);
    assign(newView, mutation);

    return assign(clone(state), {view: newView});
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

function getFailedSuitesIds(suites = []) {
    return getSuitesIds(filter(suites, isSuiteFailed));
}

function getSuitesIds(suites = []) {
    return map(suites, getSuiteId);
}

function getSuiteId(suite) {
    return suite.suitePath[0];
}
