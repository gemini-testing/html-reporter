'use strict';

import axios from 'axios';
import {assign, filter, flatMap, set, cloneDeep, compact} from 'lodash';
import actionNames from './action-names';
const {QUEUED, UPDATED} = require('lib/constants/test-statuses');
import {isSuiteFailed, isAcceptable} from './utils';
import { ISuite } from 'typings/suite-adapter';

type DispatchType = (action: any) => any;

export const initial = () => {
    return async (dispatch: DispatchType) => {
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

const runTests = ({tests = [], action = {}}: {tests?: any[], action?: any} = {}) => {
    return async (dispatch: DispatchType) => {
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

export const runFailedTests = (fails: any, actionName: string = actionNames.RUN_FAILED_TESTS) => {
    fails = filterFailedBrowsers((new Array()).concat(fails));

    return runTests({tests: fails, action: {type: actionName}});
};

export const retrySuite = (suite: ISuite) => {
    return runTests({tests: [suite], action: {type: actionNames.RETRY_SUITE}});
};

export const retryTest = (suite: ISuite, browserId: string | null = null) => {
    return runFailedTests(assign({browserId}, suite), actionNames.RETRY_TEST);
};

export const acceptAll = (fails: any) => {
    fails = filterAcceptableBrowsers([].concat(fails));

    const formattedFails = flatMap([].concat(fails), formatTests);

    return async (dispatch: DispatchType) => {
        try {
            const {data: updatedData} = await axios.post('/update-reference', compact(formattedFails));
            dispatch({type: actionNames.UPDATE_RESULT, payload: updatedData});
        } catch (e) {
            console.error('Error while updating references of failed tests:', e);
        }
    };
};

export const acceptTest = (suite: ISuite, browserId: string, attempt: number, stateName: string) => {
    return acceptAll(assign({browserId, stateName}, suite, {acceptTestAttempt: attempt}));
};

export const suiteBegin = (suite: ISuite) => ({type: actionNames.SUITE_BEGIN, payload: suite});
export const testBegin = (test: any) => ({type: actionNames.TEST_BEGIN, payload: test});
export const testResult = (result: string) => ({type: actionNames.TEST_RESULT, payload: result});
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
export const updateBaseHost = (host: string) => {
    window.localStorage.setItem('_gemini-replace-host', host);
    return {type: actionNames.VIEW_UPDATE_BASE_HOST, host};
};

export function changeViewMode(mode: string) {
    switch (mode) {
        case 'failed':
            return {type: actionNames.VIEW_SHOW_FAILED};
        default:
            return {type: actionNames.VIEW_SHOW_ALL};
    }
}

function formatTests(test: any): any {
    if (test.children) {
        return flatMap(test.children, formatTests);
    }

    if (test.browserId) {
        test.browsers = filter(test.browsers, {name: test.browserId});
    }

    const {suitePath, name, acceptTestAttempt} = test;
    const prepareImages = (images: any[], filterCond: any) => {
        return filter(images, filterCond)
            .filter(isAcceptable)
            .map(({actualPath, stateName}) => ({status: UPDATED, actualPath, stateName}));
    };

    return flatMap(test.browsers, (browser) => {
        const browserResult = getBrowserResultByAttempt(browser, acceptTestAttempt);

        let imagesInfo;
        if (test.stateName) {
            imagesInfo = prepareImages(browserResult.imagesInfo, {stateName: test.stateName});
        } else {
            imagesInfo = prepareImages(browserResult.imagesInfo, 'actualPath');
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

function filterBrowsers(suites: ISuite[] = [], filterFn: (browserResult: any) => any) {
    const modifySuite = (suite: ISuite): any => {
        if (suite.children) {
            return flatMap(suite.children, modifySuite);
        }

        return set(suite, 'browsers', filter(suite.browsers, (bro) => {
            if (suite.browserId && suite.browserId !== bro.name) {
                return false;
            }

            const browserResult = getBrowserResultByAttempt(bro, suite.acceptTestAttempt as number);

            return filterFn(browserResult);
        }));
    };

    return flatMap(cloneDeep(suites), modifySuite);
}

function filterFailedBrowsers(suites: any[] = []) {
    return filterBrowsers(suites, isSuiteFailed);
}

function filterAcceptableBrowsers(suites = []) {
    return filterBrowsers(suites, isAcceptable);
}

function getBrowserResultByAttempt(browser: any, attempt: number) {
    return attempt >= 0
        ? browser.retries.concat(browser.result)[attempt]
        : browser.result;
}
