'use strict';

import axios from 'axios';
import {assign, filter, flatMap, set, cloneDeep, compact} from 'lodash';
import actionNames from './action-names';
import {QUEUED, UPDATED} from '../../constants/test-statuses';
import {isSuiteFailed, isAcceptable} from './utils';

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
            const {data: updatedData} = await axios.post('/update-reference', compact(formattedFails));
            dispatch({type: actionNames.UPDATE_RESULT, payload: updatedData});
        } catch (e) {
            console.error('Error while updating references of failed tests:', e);
        }
    };
};

export const acceptTest = (suite, browserId, attempt, stateName) => {
    return acceptAll(assign({browserId, stateName}, suite, {acceptTestAttempt: attempt}));
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
export const toggleLazyLoad = () => ({type: actionNames.VIEW_TOGGLE_LAZY_LOAD_IMAGES});
export const updateBaseHost = (host) => {
    window.localStorage.setItem('_gemini-replace-host', host);
    return {type: actionNames.VIEW_UPDATE_BASE_HOST, host};
};

export const updateFilterByName = (filterByName) => {
    return {type: actionNames.VIEW_UPDATE_FILTER_BY_NAME, filterByName};
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
    const prepareImages = (images, filterCond) => {
        return filter(images, filterCond)
            .filter(isAcceptable)
            .map(({actualImg, stateName}) => ({status: UPDATED, actualImg, stateName}));
    };

    return flatMap(test.browsers, (browser) => {
        const browserResult = getBrowserResultByAttempt(browser, acceptTestAttempt);

        let imagesInfo;
        if (test.stateName) {
            imagesInfo = prepareImages(browserResult.imagesInfo, {stateName: test.stateName});
        } else {
            imagesInfo = prepareImages(browserResult.imagesInfo, 'actualImg');
        }

        const {metaInfo, attempt} = browserResult;

        return imagesInfo.length && {
            suite: {path: suitePath.slice(0, -1)},
            state: {name},
            browserId: browser.name,
            metaInfo,
            imagesInfo,
            attempt
        };
    });
}

function filterBrowsers(suites = [], filterFn) {
    const modifySuite = (suite) => {
        if (suite.children) {
            return flatMap(suite.children, modifySuite);
        }

        return set(suite, 'browsers', filter(suite.browsers, (bro) => {
            if (suite.browserId && suite.browserId !== bro.name) {
                return false;
            }

            const browserResult = getBrowserResultByAttempt(bro, suite.acceptTestAttempt);

            return filterFn(browserResult);
        }));
    };

    return flatMap(cloneDeep(suites), modifySuite);
}

function filterFailedBrowsers(suites = []) {
    return filterBrowsers(suites, isSuiteFailed);
}

function filterAcceptableBrowsers(suites = []) {
    return filterBrowsers(suites, isAcceptable);
}

function getBrowserResultByAttempt(browser, attempt) {
    return attempt >= 0
        ? browser.retries.concat(browser.result)[attempt]
        : browser.result;
}
