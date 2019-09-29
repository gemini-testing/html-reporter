'use strict';

import url from 'url';
import actionNames from './action-names';
import defaultState from './default-state';
import {assign, clone, cloneDeep, filter, find, last, map, merge, reduce} from 'lodash';
import {dateToLocaleString, findNode, isSuiteFailed, setStatusForBranch, setStatusToAll} from './utils';
import {groupErrors} from './group-errors';
import * as localStorageWrapper from './local-storage-wrapper';
import columns from './db-column-names';

const compiledData = window.data || defaultState;

function getInitialState(data) {
    const {
        skips, suites, config, total, updated, passed,
        failed, skipped, warned, retries, perBrowser, apiValues, gui = false, date, saveFormat
    } = data;
    const {errorPatterns, scaleImages, lazyLoadOffset, defaultView: viewMode} = config;
    const parsedURL = new URL(window.location.href);
    const filteredBrowsers = parsedURL.searchParams.getAll('browser');

    let formattedSuites;
    if (saveFormat === 'sqlite') {
        formattedSuites = {};
    } else {
        formattedSuites = formatSuitesData(suites);
    }

    const groupedErrors = groupErrors({suites: formattedSuites.suites, viewMode, errorPatterns, filteredBrowsers});

    localStorageWrapper.updateDeprecatedKeys();
    const view = localStorageWrapper.getItem('view', {});
    const host = _loadBaseHost(config.baseHost, localStorageWrapper);

    return merge(defaultState, {
        gui,
        skips,
        groupedErrors,
        config,
        apiValues,
        date: dateToLocaleString(date),
        saveFormat,
        stats: {
            all: {total, updated, passed, failed, skipped, retries, warned},
            perBrowser
        },
        view: merge({
            viewMode,
            scaleImages,
            lazyLoadOffset,
            filteredBrowsers
        }, host, view)
    }, formattedSuites);
}

export default withBrowserStorage(reducer);

function reducer(state = getInitialState(compiledData), action) {
    switch (action.type) {
        case actionNames.VIEW_INITIAL: {
            const {
                gui,
                autoRun,
                suites,
                skips,
                apiValues,
                config: {scaleImages, lazyLoadOffset}
            } = action.payload;
            const {errorPatterns} = state.config;
            const {filteredBrowsers, testNameFilter, viewMode} = state.view;

            const formattedSuites = formatSuitesData(suites);
            const groupedErrors = groupErrors({
                suites: formattedSuites.suites,
                viewMode,
                errorPatterns,
                filteredBrowsers,
                testNameFilter
            });

            const view = localStorageWrapper.getItem('view', {});

            return merge(
                {},
                state,
                {
                    gui,
                    autoRun,
                    skips,
                    groupedErrors,
                    apiValues,
                    view: {scaleImages, lazyLoadOffset}
                },
                formattedSuites,
                {view}
            );
        }
        case actionNames.RUN_ALL_TESTS: {
            const suites = clone(state.suites);
            Object.values(suites).forEach(suite => setStatusToAll(suite, action.payload.status));

            // TODO: rewrite store on run all tests
            return merge({}, state, {running: true, suites, view: {groupByError: false}});
        }
        case actionNames.RUN_FAILED_TESTS:
        case actionNames.RETRY_SUITE:
        case actionNames.RETRY_TEST: {
            return {
                ...state,
                running: true,
                view: {
                    ...state.view,
                    groupByError: false
                }
            };
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
            return _mutateViewMode(state, 'all');
        }
        case actionNames.VIEW_SHOW_FAILED: {
            return _mutateViewMode(state, 'failed');
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
            const {testNameFilter} = action;
            const {
                suites,
                config: {errorPatterns},
                view: {viewMode, filteredBrowsers}
            } = state;

            const groupedErrors = groupErrors({suites, viewMode, errorPatterns, filteredBrowsers, testNameFilter});

            return {
                ...state,
                groupedErrors,
                view: {
                    ...state.view,
                    testNameFilter
                }
            };
        }
        case actionNames.CLOSE_SECTIONS: {
            const closeIds = action.payload;
            return assign(clone(state), {closeIds});
        }
        case actionNames.VIEW_TOGGLE_GROUP_BY_ERROR: {
            return _mutateStateView(state, {groupByError: !state.view.groupByError});
        }
        case actionNames.TOGGLE_TEST_RESULT: {
            const {opened} = action.payload;
            return updateTestState(state, action, {opened});
        }
        case actionNames.TOGGLE_STATE_RESULT: {
            return updateStateResult(state, action);
        }
        case actionNames.TOGGLE_LOADING: {
            const loading = action.payload;
            return assign(clone(state), {loading});
        }
        case actionNames.SHOW_MODAL: {
            const modal = action.payload;
            return assign(clone(state), {modal});
        }
        case actionNames.HIDE_MODAL: {
            return assign(clone(state), {modal: {}});
        }
        case actionNames.CHANGE_TEST_RETRY: {
            const {retryIndex} = action.payload;
            return updateTestState(state, action, {retryIndex});
        }
        case actionNames.FETCH_DB: {
            console.log('fetched db, updating state');
            return createTestResultsFromDb(state, action);
        }
        case actionNames.CLOSE_DB: {
            return closeDb(state);
        }
        default:
            return state;
    }
}

function createTestResultsFromDb(state, action) {
    const {db, stats} = action.payload;
    if (stats.fetched === 0) {
        return {
            ...state,
            dbStats: stats
        };
    }
    const values = db.exec('select * from suites order by timestamp DESC')[0].values;

    console.log(values);

    const formattedSuites = formatSuitesDataFromDb(values);
    const {suites, suiteIds} = formattedSuites;
    return {
        ...state,
        suites,
        suiteIds,
        db,
        dbStats: stats
    };
}

function updateParentsStatus(node) {
    if (node.status === 'error') {
        return;
    }
    node.status = 'error';
    if (node.parent) {
        updateParentsStatus(node.parent);
    }
}

function findPlaceToInsert(suite, node, suitePath) {
    const pathPart = suitePath.shift();
    if (pathPart === undefined) {
        node.browsers = Array.isArray(node.browsers) ? node.browsers : [];
        if (suite.status === 'error') {
            updateParentsStatus(node);
        }
        let browser = find(node.browsers, {name: suite.children[0].browsers[0].name});
        if (!browser) {
            node.browsers.push(suite.children[0].browsers[0]);
            return;
        }
        browser.retries.push(suite.children[0].browsers[0].result);
        return;
    }
    node.children = Array.isArray(node.children) ? node.children : [];
    let child = find(node.children, {name: pathPart});
    if (!child) {
        child = {
            name: pathPart,
            suitePath: node.suitePath.concat(pathPart),
            status: 'success',
            parent: node
        };
        node.children.push(child);
    }
    findPlaceToInsert(suite, child, suitePath);
}

function formatSuitesDataFromDb(suites = []) {
    return {
        suites: reduce(suites, (acc, s) => {
            const suiteId = getSuiteIdFromDb(s);
            const suite = {
                suitePath: JSON.parse(s[columns.suitePath]),
                name: suiteId,
                children: [{
                    name: s[columns.suiteName],
                    status: s[columns.status],
                    suitePath: JSON.parse(s[columns.suitePath]),
                    browsers: [
                        {
                            name: s[columns.name],
                            result: {
                                attempt: s[columns.timestamp],
                                description: s[columns.description],
                                imagesInfo: JSON.parse(s[columns.imagesInfo]),
                                metaInfo: JSON.parse(s[columns.metaInfo]),
                                multipleTabs: s[columns.multipleTabs],
                                name: s[columns.name],
                                screenshot: s[columns.screenshot],
                                status: s[columns.status],
                                suiteUrl: s[columns.suitUrl]
                            },
                            retries: []
                        }
                    ]
                }],
                status: s[columns.status]
            };
            if (!acc[suiteId]) {
                acc[suiteId] = {
                    name: suiteId,
                    suitePath: [suiteId],
                    status: 'success'
                };
            }
            const suitePath = [...suite.suitePath];
            suitePath.shift();
            findPlaceToInsert(suite, acc[suiteId], suitePath);
            return acc;
        }, {}),
        suiteIds: {
            all: getSuiteIdsFromDb(suites),
            failed: []
        }
    };
}

function getSuiteIdFromDb(suite) {
    return JSON.parse(suite[columns.suitePath])[0];
}

function closeDb(state) {
    state.db.close();
    return state;
}

function addTestResult(state, action) {
    const {
        config: {errorPatterns},
        view: {viewMode, filteredBrowsers, testNameFilter}
    } = state;
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
        setStatusForBranch(suites, suitePath);
        forceUpdateSuiteData(suites, test);
    });

    const suiteIds = clone(state.suiteIds);
    assign(suiteIds, {failed: getFailedSuiteIds(suites)});

    const groupedErrors = groupErrors({suites, viewMode, errorPatterns, filteredBrowsers, testNameFilter});

    return assign({}, state, {suiteIds, suites, groupedErrors});
}

function updateTestState(state, action, testState) {
    const suites = clone(state.suites);
    const {suitePath, browserId} = action.payload;
    const test = findNode(suites, suitePath);

    if (!test) {
        return;
    }

    test.browsers.forEach((b) => {
        if (b.name === browserId) {
            merge(b, {state: testState});
        }
    });

    return assign({}, state, {suites});
}

function updateStateResult(state, action) {
    const suites = clone(state.suites);
    const {suitePath, browserId, stateName, retryIndex, opened} = action.payload;
    const test = findNode(suites, suitePath);

    if (!test) {
        return;
    }

    const bro = find(test.browsers, {name: browserId});

    if (!bro) {
        return;
    }

    const broResult = bro.retries.concat(bro.result)[retryIndex];
    const stateResult = stateName ? find(broResult.imagesInfo, {stateName}) : last(broResult.imagesInfo);

    assign(stateResult, {opened});

    return {...state, suites};
}

function _mutateStateView(state, mutation) {
    const newView = clone(state.view);
    assign(newView, mutation);

    return assign(clone(state), {view: newView});
}

function _mutateViewMode(state, viewMode) {
    const {
        suites,
        config: {errorPatterns},
        view: {filteredBrowsers, testNameFilter}
    } = state;
    const groupedErrors = groupErrors({suites, viewMode, errorPatterns, filteredBrowsers, testNameFilter});

    return {
        ...state,
        groupedErrors,
        view: {
            ...state.view,
            viewMode
        }
    };
}

function _loadBaseHost(configuredHost, storage) {
    if (!storage) {
        return configuredHost;
    }

    const storageHost = storage.getItem('replace-host');
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

function getSuiteIdsFromDb(suites = []) {
    return [...new Set(map(suites, getSuiteIdFromDb))];
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

export function withBrowserStorage(reducer) {
    return (state, action) => {
        const newState = reducer(state, action);

        if (/^VIEW_/.test(action.type)) {
            const {view} = newState;
            localStorageWrapper.setItem('view', {
                expand: view.expand,
                viewMode: view.viewMode,
                showSkipped: view.showSkipped,
                showOnlyDiff: view.showOnlyDiff,
                scaleImages: view.scaleImages,
                // TODO: Uncomment when issues with rendering speed will fixed
                // lazyLoadOffset: view.lazyLoadOffset,
                groupByError: view.groupByError,
                testNameFilter: view.testNameFilter
            });
        }

        return newState;
    };
}
