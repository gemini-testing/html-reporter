'use strict';

import axios from 'axios';
import {assign, filter, flatMap, set, cloneDeep} from 'lodash';
import actionNames from './action-names';
import {QUEUED} from '../../constants/test-statuses';
import {isSuiteFailed, isAcceptable} from './utils';

const localStorage = window.localStorage;

export const initial = () => {
    return async (dispatch) => {
        try {
            const appState = await axios.get('/init');
            dispatch({
                type: actionNames.VIEW_INITIAL,
                payload: appState.data
            });
        } catch (e) {
            console.error('Error while getting initial data:', e);
        }
    };
};

const runTests = ({tests = [], action = {}} = {}) => {
    return async (dispatch) => {
        try {
            await axios.post('/run', tests);
            dispatch(action);
        } catch (e) {
            console.error('Error while running tests:', e);
        }
    };
};

export const runAllTests = () => {
    return runTests({action: {
        type: actionNames.RUN_ALL_TESTS,
        payload: {status: QUEUED}
    }});
};

export const runFailedTests = (fails, actionName = actionNames.RUN_FAILED_TESTS) => {
    fails = filterFailedBrowsers([].concat(fails));

    return runTests({tests: fails, action: {type: actionName}});
};

export const retrySuite = (suite) => {
    return runTests({tests: [suite], action: {type: actionNames.RETRY_SUITE}});
};

export const retryTest = (suite, browserId = null) => {
    return runFailedTests(assign({browserId}, suite), actionNames.RETRY_TEST);
};

export const acceptAll = (fails) => {
    fails = filterAcceptableBrowsers([].concat(fails));

    const formattedFails = flatMap([].concat(fails), formatTests);

    return async (dispatch) => {
        try {
            const {data: updatedData} = await axios.post('/update-reference', formattedFails);
            dispatch({type: actionNames.UPDATE_RESULT, payload: updatedData});
        } catch (e) {
            console.error('Error while updating references of failed tests:', e);
        }
    };
};

export const acceptTest = (suite, browserId, attempt) => {
    return acceptAll(assign({browserId}, suite, {acceptTestAttempt: attempt}));
};

export const suiteBegin = (suite) => ({type: actionNames.SUITE_BEGIN, payload: suite});
export const testBegin = (test) => ({type: actionNames.TEST_BEGIN, payload: test});
export const testResult = (result) => ({type: actionNames.TEST_RESULT, payload: result});
export const testsEnd = () => ({type: actionNames.TESTS_END});
export const runFailed = () => ({type: actionNames.RUN_FAILED_TESTS});
export const expandAll = () => ({type: actionNames.VIEW_EXPAND_ALL});
export const expandErrors = () => ({type: actionNames.VIEW_EXPAND_ERRORS});
export const expandRetries = () => ({type: actionNames.VIEW_EXPAND_RETRIES});
export const collapseAll = () => ({type: actionNames.VIEW_COLLAPSE_ALL});
export const toggleSkipped = () => ({type: actionNames.VIEW_TOGGLE_SKIPPED});
export const toggleOnlyDiff = () => ({type: actionNames.VIEW_TOGGLE_ONLY_DIFF});
export const toggleScaleImages = () => ({type: actionNames.VIEW_TOGGLE_SCALE_IMAGES});
export const updateBaseHost = (host) => {
    localStorage.setItem('_gemini-replace-host', host);
    return {type: actionNames.VIEW_UPDATE_BASE_HOST, host};
};

export function changeViewMode(mode) {
    switch (mode) {
        case 'failed':
            return {type: actionNames.VIEW_SHOW_FAILED};
        default:
            return {type: actionNames.VIEW_SHOW_ALL};
    }
}

function formatTests(test) {
    if (test.children) {
        return flatMap(test.children, formatTests);
    }

    if (test.browserId) {
        test.browsers = filter(test.browsers, {name: test.browserId});
    }

    const {suitePath, name, acceptTestAttempt} = test;

    return flatMap(test.browsers, (browser) => {
        const {actualPath} = acceptTestAttempt >= 0
            ? browser.retries.concat(browser.result)[acceptTestAttempt]
            : browser.result;

        const {metaInfo, assertViewState, attempt} = browser.result;

        return {
            suite: {path: suitePath.slice(0, -1)},
            state: {name},
            browserId: browser.name,
            metaInfo,
            assertViewState,
            attempt,
            actualPath
        };
    });
}

function filterBrowsers(suites = [], filterFn) {
    const modifySuite = (suite) => {
        return suite.children
            ? flatMap(suite.children, modifySuite)
            : set(suite, 'browsers', filter(suite.browsers, ({result}) => filterFn(result)));
    };

    return flatMap(cloneDeep(suites), modifySuite);
}

function filterFailedBrowsers(suites = []) {
    return filterBrowsers(suites, isSuiteFailed);
}

function filterAcceptableBrowsers(suites = []) {
    return filterBrowsers(suites, isAcceptable);
}
