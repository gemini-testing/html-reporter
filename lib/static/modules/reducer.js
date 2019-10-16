'use strict';

import url from 'url';
import actionNames from './action-names';
import defaultState from './default-state';
import {assign, clone, cloneDeep, filter, find, last, map, merge, reduce} from 'lodash';
import {
    dateToLocaleString,
    findNode,
    isSuiteFailed,
    isDbSuiteFailed,
    setStatusForBranch,
    setStatusToAll,
    sortByTimeStamp,
    updateSuitesStats,
    isSqlite
} from './utils';
import {groupErrors} from './group-errors';
import * as localStorageWrapper from './local-storage-wrapper';
import columns from './db-column-names';
import testStatus from '../../constants/test-statuses';

const compiledData = window.data || defaultState;

function getInitialState(data) {
    const {
        skips, suites, config, total, updated, passed,
        failed, skipped, warned, retries, perBrowser, apiValues, gui = false, date, saveFormat
    } = data;
    const {errorPatterns, scaleImages, lazyLoadOffset, defaultView: viewMode, databaseUrlsFile} = config;
    const parsedURL = new URL(window.location.href);
    const filteredBrowsers = parsedURL.searchParams.getAll('browser');

    let formattedSuites;
    if (isSqlite(saveFormat)) {
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
        databaseUrlsFile,
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

    // let values = db.exec('select * from suites')[0].values;
    const databaseRows = db.exec('select * from suites')[0];
    let values = databaseRows ? databaseRows.values : [];
    values = values.sort(sortByTimeStamp);
    const formattedSuites = formatSuitesDataFromDb(values);
    const {suites, suitesStats} = formattedSuites;
    const {failed, passed, retries, skipped, total} = suitesStats;
    const suiteIds = {
        all: getSuiteIds(suites),
        failed: getFailedSuiteIds(suites)
    };

    const parsedURL = new URL(window.location.href);
    const filteredBrowsers = parsedURL.searchParams.getAll('browser');
    const groupedErrors = groupErrors({suites: suites, viewMode: state.view.viewMode, errorPatterns: state.config.errorPatterns, filteredBrowsers});

    return {
        ...state,
        suites,
        suiteIds,
        db,
        dbStats: stats,
        stats: {
            all: {
                failed,
                passed,
                retries,
                skipped,
                total
            }
        },
        skips: suitesStats.skippedTests,
        groupedErrors
    };
}

function setErrorToParents(node, id) {
    node.status = testStatus.ERROR;
    node.failedIds[id] = true;
    if (node.parent) {
        setErrorToParents(node.parent, id);
    }
}

function removeErrorFromParents(node, id) {
    if (!node.failedIds[id]) {
        return;
    }
    delete node.failedIds[id];
    if (Object.keys(node.failedIds).length === 0) {
        node.status = testStatus.SUCCESS;
    }
    if (node.parent) {
        removeErrorFromParents(node.parent, id);
    }
}

function findPlaceToInsert(suite, node, suitePath, suitesStats) {
    const pathPart = suitePath.shift();
    if (!pathPart) {
        node.browsers = Array.isArray(node.browsers) ? node.browsers : [];
        const suiteId = suite.suitePath.join('') + suite.children[0].browsers[0].name;

        switch (suite.status) {
            case testStatus.ERROR: {
                setErrorToParents(node, suiteId);
                break;
            }
            case testStatus.SUCCESS: {
                removeErrorFromParents(node, suiteId);
                break;
            }
            case testStatus.SKIPPED: {
                removeErrorFromParents(node, suiteId);
                suitesStats.skippedTests.push({
                    browser: suite.children[0].browsers[0].name,
                    suite: suite.suitePath.join(' '),
                    comment: suite.children[0].browsers[0].result.skipReason
                });
                break;
            }
        }
        updateSuitesStats(suitesStats, suite.status, suiteId);
        const browser = find(node.browsers, {name: suite.children[0].browsers[0].name});
        if (!browser) {
            node.browsers.push(suite.children[0].browsers[0]);
            return;
        }
        browser.retries.push(browser.result);
        browser.result = suite.children[0].browsers[0].result; //set the result to the latest attempt
        return;
    }
    node.children = Array.isArray(node.children) ? node.children : [];
    let child = find(node.children, {name: pathPart});
    if (!child) {
        child = {
            name: pathPart,
            suitePath: node.suitePath.concat(pathPart),
            status: testStatus.SUCCESS,
            failedIds: {},
            parent: node
        };
        node.children.push(child);
    }
    findPlaceToInsert(suite, child, suitePath, suitesStats);
}

function formatSuitesDataFromDb(suites = []) {
    const suitesStats = {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        retries: 0,
        failedTestIds: {},
        passedTestIds: {},
        skippedTests: []
    };
    const suitesTree = {};
    for (const suite of suites) {
        const suiteId = getSuiteIdFromDb(suite);
        const formattedSuite = {
            suitePath: JSON.parse(suite[columns.suitePath]),
            name: suiteId,
            children: [{
                name: suite[columns.suiteName],
                status: suite[columns.status],
                suitePath: JSON.parse(suite[columns.suitePath]),
                browsers: [
                    {
                        name: suite[columns.name],
                        result: {
                            attempt: suite[columns.timestamp],
                            description: suite[columns.description],
                            imagesInfo: JSON.parse(suite[columns.imagesInfo]),
                            metaInfo: JSON.parse(suite[columns.metaInfo]),
                            multipleTabs: suite[columns.multipleTabs] === 1,
                            name: suite[columns.name],
                            screenshot: suite[columns.screenshot] === 1,
                            status: suite[columns.status],
                            suiteUrl: suite[columns.suiteUrl],
                            skipReason: suite[columns.skipReason],
                            error: JSON.parse(suite[columns.error])
                        },
                        retries: []
                    }
                ]
            }],
            status: suite[columns.status]
        };
        if (!suitesTree[suiteId]) {
            suitesTree[suiteId] = {
                name: suiteId,
                suitePath: [suiteId],
                status: testStatus.SUCCESS,
                failedIds: {}
            };
        }
        // eslint-disable-next-line no-unused-vars
        const [_, ...suitePath] = formattedSuite.suitePath;
        findPlaceToInsert(formattedSuite, suitesTree[suiteId], suitePath, suitesStats);
    }
    return {
        suites: suitesTree,
        suiteIds: {
            all: getSuiteIdsFromDb(suites).sort(),
            failed: getFailedSuiteIdsFromDb(suites)
        },
        suitesStats
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

function getFailedSuiteIdsFromDb(suites) {
    return getSuiteIdsFromDb(filter(suites, isDbSuiteFailed));
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
