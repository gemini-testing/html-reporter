'use strict';

import url from 'url';
import actionNames from './action-names';
import defaultState from './default-state';
import {assign, merge, filter, map, clone, cloneDeep, reduce} from 'lodash';
import {isSuiteFailed, setStatusToAll, findNode, setStatusForBranch} from './utils';

const compiledData = window.data || defaultState;
const localStorage = window.localStorage;

function getInitialState(compiledData) {
    const {skips, suites, config, total, updated, passed,
        failed, skipped, warned, retries, extraItems, gui = false} = compiledData;
    const formattedSuites = formatSuitesData(suites);

    return merge(defaultState, {
        gui,
        skips,
        config,
        extraItems,
        stats: {total, updated, passed, failed, skipped, retries, warned},
        view: {
            viewMode: config.defaultView,
            scaleImages: config.scaleImages,
            lazyLoadOffset: config.lazyLoadOffset,
            ..._loadBaseHost(config.baseHost, localStorage),
            filterByName: ''
        }
    }, formattedSuites);
}

export default function reducer(state = getInitialState(compiledData), action) {
    switch (action.type) {
        case actionNames.VIEW_INITIAL: {
            const {gui, autoRun, suites, skips, extraItems, config: {scaleImages, lazyLoadOffset}} = action.payload;
            const formattedSuites = formatSuitesData(suites);

            return merge({}, state, {gui, autoRun, skips, extraItems, view: {scaleImages, lazyLoadOffset}}, formattedSuites);
        }
        case actionNames.RUN_ALL_TESTS: {
            const suites = clone(state.suites);
            setStatusToAll(suites, action.payload.status);

            return merge({}, state, {running: true, suites}); // TODO: rewrite store on run all tests
        }
        case actionNames.RUN_FAILED_TESTS:
        case actionNames.RETRY_SUITE:
        case actionNames.RETRY_TEST: {
            return assign(clone(state), {running: true});
        }
        case actionNames.SUITE_BEGIN: {
            const suites = clone(state.suites);
            const {suitePath, status} = action.payload;
            const test = findNode(suites, suitePath);
            if (test) {
                test.status = status;
                forceUpdateSuiteData(suites, test);
            }

            return assign({}, state, {suites});
        }
        case actionNames.TEST_BEGIN: {
            const suites = clone(state.suites);
            const {suitePath, status, browserId} = action.payload;
            const test = findNode(suites, suitePath);
            if (test) {
                test.status = status;
                test.browsers.forEach((b) => {
                    if (b.name === browserId) {
                        b.result.status = status;
                    }
                });
                forceUpdateSuiteData(suites, test);
            }

            return assign({}, state, {suites});
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
        case actionNames.VIEW_EXPAND_RETRIES: {
            return _mutateStateView(state, {expand: 'retries'});
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
        case actionNames.VIEW_TOGGLE_ONLY_DIFF: {
            return _mutateStateView(state, {showOnlyDiff: !state.view.showOnlyDiff});
        }
        case actionNames.VIEW_TOGGLE_SCALE_IMAGES: {
            return _mutateStateView(state, {scaleImages: !state.view.scaleImages});
        }
        case actionNames.VIEW_TOGGLE_LAZY_LOAD_IMAGES: {
            return _mutateStateView(state, {lazyLoadOffset: state.view.lazyLoadOffset ? 0 : state.config.lazyLoadOffset});
        }
        case actionNames.VIEW_UPDATE_BASE_HOST: {
            const baseHost = action.host;
            const parsedHost = _parseHost(baseHost);

            return _mutateStateView(state, {baseHost, parsedHost});
        }
        case actionNames.VIEW_UPDATE_FILTER_BY_NAME: {
            return _mutateStateView(state, {
                filterByName: action.filterByName
            });
        }
        default:
            return state;
    }
}

function addTestResult(state, action) {
    const suites = clone(state.suites);

    [].concat(action.payload).forEach((suite) => {
        const {suitePath, browserResult, browserId} = suite;
        const test = findNode(suites, suitePath);

        if (!test) {
            return;
        }

        test.browsers.forEach((b) => {
            if (b.name === browserId) {
                Object.assign(b, browserResult);
            }
        });
        setStatusForBranch(suites, suitePath, browserResult.result.status);
        forceUpdateSuiteData(suites, test);
    });

    const suiteIds = clone(state.suiteIds);
    assign(suiteIds, {failed: getFailedSuiteIds(suites)});

    return assign({}, state, {suiteIds, suites});
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

function formatSuitesData(suites = []) {
    return {
        suites: reduce(suites, (acc, s) => {
            acc[getSuiteId(s)] = s;
            return acc;
        }, {}),
        suiteIds: {
            all: getSuiteIds(suites),
            failed: getFailedSuiteIds(suites)
        }
    };
}

function getFailedSuiteIds(suites) {
    return getSuiteIds(filter(suites, isSuiteFailed));
}

function getSuiteIds(suites = []) {
    return map(suites, getSuiteId);
}

function getSuiteId(suite) {
    return suite.suitePath[0];
}

/*
 *  To re-render suite we need to change object reference because of shallow data comparing
 */
function forceUpdateSuiteData(suites, test) {
    const id = getSuiteId(test);
    suites[id] = cloneDeep(suites[id]);
}
