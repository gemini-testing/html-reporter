'use strict';

import url from 'url';
import _ from 'lodash';
import {assign, clone, cloneDeep, filter, find, last, map, merge, reduce, isEmpty} from 'lodash';
import StaticTestsTreeBuilder from '../../../tests-tree-builder/static';
import actionNames from '../action-names';
import defaultState from '../default-state';
import {
    dateToLocaleString,
    findNode,
    isSuiteFailed,
    setStatusForBranch,
    setStatusToAll
} from '../utils';

import {
    getSuitesTableRows,
    closeDatabase
} from '../database-utils';
import {groupErrors} from '../group-errors';
import * as localStorageWrapper from './helpers/local-storage-wrapper';
import {getViewQuery} from '../custom-queries';
import viewModes from '../../../constants/view-modes';
import {versions as BrowserVersions} from '../../../constants/browser';
import {CONTROL_TYPE_RADIOBUTTON} from '../../../gui/constants/custom-gui-control-types';

const compiledData = window.data || defaultState;

function getInitialState(data) {
    const {
        skips, suites, config, total, updated, passed,
        failed, skipped, warned, retries, perBrowser, apiValues, gui = false, autoRun, date
    } = data;

    config.errorPatterns = config.errorPatterns.map((patternInfo) => ({...patternInfo, regexp: new RegExp(patternInfo.pattern)}));

    const {errorPatterns, scaleImages, lazyLoadOffset, defaultView: viewMode} = config;
    const viewQuery = getViewQuery(window.location.search);

    let formattedSuites = {};

    if (suites) {
        formattedSuites = formatSuitesData(suites);
    }

    const browsers = extractBrowsers(formattedSuites.suites);

    if (isEmpty(viewQuery.filteredBrowsers)) {
        viewQuery.filteredBrowsers = browsers;
    }

    const groupedErrors = groupErrors(
        assign({
            suites: formattedSuites.suites,
            viewMode,
            errorPatterns
        }, viewQuery)
    );

    localStorageWrapper.updateDeprecatedKeys();
    const view = localStorageWrapper.getItem('view', {});
    const host = compiledData.config.baseHost;

    return merge({}, defaultState, {
        gui,
        autoRun,
        skips,
        groupedErrors,
        config,
        apiValues,
        date: dateToLocaleString(date),
        stats: {
            all: {total, updated, passed, failed, skipped, retries, warned},
            perBrowser
        },
        view: merge({
            viewMode,
            scaleImages,
            lazyLoadOffset
        }, host, view, viewQuery),
        browsers
    }, formattedSuites);
}

export default withBrowserStorage(reducer);
function reducer(state = getInitialState(compiledData), action) {
    switch (action.type) {
        case actionNames.VIEW_INITIAL: {
            return getInitialState({...compiledData, ...action.payload});
        }
        case actionNames.RUN_ALL_TESTS: {
            const suites = clone(state.suites);
            Object.values(suites).forEach(suite => setStatusToAll(suite, action.payload.status));

            // TODO: rewrite store on run all tests
            return merge({}, state, {running: true, processing: true, suites, view: {groupByError: false}});
        }
        case actionNames.RUN_FAILED_TESTS:
        case actionNames.RETRY_SUITE:
        case actionNames.RETRY_TEST: {
            return {
                ...state,
                running: true,
                processing: true,
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
            return assign(clone(state), {running: false, processing: false});
        }
        case actionNames.TEST_RESULT: {
            return addTestResult(state, action);
        }
        case actionNames.PROCESS_BEGIN: {
            return assign(clone(state), {processing: true});
        }
        case actionNames.PROCESS_END: {
            return assign(clone(state), {processing: false});
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
            return _mutateViewMode(state, viewModes.ALL);
        }
        case actionNames.VIEW_SHOW_FAILED: {
            return _mutateViewMode(state, viewModes.FAILED);
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
                view: {viewMode, filteredBrowsers, strictMatchFilter}
            } = state;

            const groupedErrors = groupErrors({suites, viewMode, errorPatterns, filteredBrowsers, testNameFilter, strictMatchFilter});

            return {
                ...state,
                groupedErrors,
                view: {
                    ...state.view,
                    testNameFilter
                }
            };
        }
        case actionNames.VIEW_SET_STRICT_MATCH_FILTER: {
            const {strictMatchFilter} = action;
            const {
                suites,
                config: {errorPatterns},
                view: {viewMode, filteredBrowsers, testNameFilter}
            } = state;

            const groupedErrors = groupErrors({suites, viewMode, errorPatterns, filteredBrowsers, testNameFilter, strictMatchFilter});

            return {
                ...state,
                groupedErrors,
                view: {
                    ...state.view,
                    strictMatchFilter
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
        case actionNames.RUN_CUSTOM_GUI_ACTION: {
            const {sectionName, groupIndex, controlIndex} = action.payload;

            const customGui = cloneDeep(state.config.customGui);
            const {type, controls} = customGui[sectionName][groupIndex];

            if (type === CONTROL_TYPE_RADIOBUTTON) {
                controls.forEach((control, i) => control.active = (controlIndex === i));

                return {
                    ...state,
                    config: {
                        ...state.config,
                        customGui
                    }
                };
            }

            return state;
        }
        case actionNames.BROWSERS_SELECTED: {
            const {browsers} = action.payload;
            const groupedErrors = groupErrors({
                suites: state.suites,
                viewMode: state.view.viewMode,
                errorPatterns: state.config.errorPatterns,
                testNameFilter: state.view.testNameFilter,
                strictMatchFilter: state.view.strictMatchFilter,
                filteredBrowsers: browsers
            });
            const view = clone(state.view);

            view.filteredBrowsers = browsers;

            return assign(clone(state), {view, groupedErrors});
        }
        default:
            return state;
    }
}

function createTestResultsFromDb(state, action) {
    const {db, fetchDbDetails} = action.payload;
    const testsTreeBuilder = StaticTestsTreeBuilder.create();

    if (fetchDbDetails.length === 0) {
        return {
            ...state,
            fetchDbDetails
        };
    }

    if (!db) {
        console.error('There was an error creating the result database.');
        return {
            ...state,
            fetchDbDetails
        };
    }

    const suitesRows = getSuitesTableRows(db);
    const {tree: {suites}, stats, skips, browsers} = testsTreeBuilder.build(suitesRows);
    const {perBrowser, ...restStats} = stats;
    const suiteIds = {
        all: getSuiteIds(suites).sort(),
        failed: getFailedSuiteIds(suites).sort()
    };
    const viewQuery = getViewQuery(window.location.search);
    const groupedErrors = groupErrors(
        assign({
            suites,
            viewMode: state.view.viewMode,
            errorPatterns: state.config.errorPatterns
        }, viewQuery)
    );

    return {
        ...state,
        db,
        suites,
        suiteIds,
        fetchDbDetails,
        stats: {
            all: restStats,
            perBrowser
        },
        skips,
        browsers,
        view: merge(state.view, {
            browsers,
            filteredBrowsers: _.isEmpty(viewQuery.filteredBrowsers)
                ? browsers
                : viewQuery.filteredBrowsers
        }),
        groupedErrors
    };
}

function closeDb(state) {
    closeDatabase(state.db);

    return state;
}

function addTestResult(state, action) {
    const {
        config: {errorPatterns},
        view: {viewMode, filteredBrowsers, testNameFilter, strictMatchFilter}
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
                assign(b, browserResult);
            }
        });
        setStatusForBranch(suites, suitePath);
        forceUpdateSuiteData(suites, test);
    });

    const suiteIds = clone(state.suiteIds);
    assign(suiteIds, {failed: getFailedSuiteIds(suites)});

    const groupedErrors = groupErrors({suites, viewMode, errorPatterns, filteredBrowsers, testNameFilter, strictMatchFilter});

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
        view: {filteredBrowsers, testNameFilter, strictMatchFilter}
    } = state;
    const groupedErrors = groupErrors({suites, viewMode, errorPatterns, filteredBrowsers, testNameFilter, strictMatchFilter});

    return {
        ...state,
        groupedErrors,
        view: {
            ...state.view,
            viewMode
        }
    };
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

function extractBrowsers(suite) {
    const getVersion = ({result}) => ({
        id: result.name,
        versions: _.get(result, 'metaInfo.browserVersion', BrowserVersions.UNKNOWN)
    });
    const getVersions = (browsers = []) => browsers.map(getVersion);
    const getUniqVersions = (set) => _(set)
        .map('versions')
        .compact()
        .uniq()
        .value();
    const iterate = (node) => []
        .concat(node.children)
        .map((subNode = {}) => subNode.children ? iterate(subNode) : getVersions(subNode.browsers));

    return _(suite)
        .values(suite)
        .map(iterate)
        .flattenDeep()
        .groupBy('id')
        .mapValues(getUniqVersions)
        .map((versions, id) => ({id, versions}))
        .value();
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

export function withBrowserStorage(reducer) {
    return (state, action) => {
        const newState = reducer(state, action);

        if (/^VIEW_/.test(action.type)) {
            const {view} = newState;
            // do not save text inputs:
            // for example, a user opens a new report and sees no tests in it
            // as the filter is applied from the previous opening of another report
            localStorageWrapper.setItem('view', {
                expand: view.expand,
                viewMode: view.viewMode,
                showSkipped: view.showSkipped,
                showOnlyDiff: view.showOnlyDiff,
                scaleImages: view.scaleImages,
                // TODO: Uncomment when issues with rendering speed will fixed
                // lazyLoadOffset: view.lazyLoadOffset,
                groupByError: view.groupByError,
                strictMatchFilter: view.strictMatchFilter
            });
        }

        return newState;
    };
}
