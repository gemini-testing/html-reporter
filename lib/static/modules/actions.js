'use strict';

import axios from 'axios';
import {assign, filter, flatMap, get, cloneDeep, isEmpty, compact, difference, omit} from 'lodash';
import actionNames from './action-names';
import modalTypes from './modal-types';
import {QUEUED, UPDATED} from '../../constants/test-statuses';
import {VIEW_CHANGED} from '../../constants/client-events';
import {isSuiteIdle, isSuiteSuccessful, isSuiteFailed, isAcceptable} from './utils';
import {isFailStatus, isErroredStatus} from '../../common-utils';
import {
    getRefImagesInfo, getAllOpenedImagesInfo, getImagesInfoId, filterByBro, rejectRefImagesInfo,
    filterStatus, filterImagesInfo, filterByEqualDiffSizes
} from './find-same-diffs-utils';

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

export const runSuccessfulTests = (successfulTests, actionName = actionNames.RETRY_TEST) => {
    return runTests({tests: successfulTests, action: {type: actionName}});
};

export const retrySuite = (suite) => {
    return runTests({tests: [suite], action: {type: actionNames.RETRY_SUITE}});
};

export const retryTest = (suite, browserId = null) => {
    let tests = assign({browserId}, suite);

    if (browserId) {
        tests = omit(tests, 'children');
    }

    return isSuiteIdle(suite) || isSuiteSuccessful(suite)
        ? runSuccessfulTests(tests, actionNames.RETRY_TEST)
        : runFailedTests(tests, actionNames.RETRY_TEST);
};

export const acceptOpened = (fails) => {
    fails = filterAcceptableBrowsers([].concat(fails));

    const formattedFails = flatMap([].concat(fails), formatTests);

    return async (dispatch) => {
        try {
            const {data: updatedData} = await axios.post('/update-reference', compact(formattedFails));
            window.dispatchEvent(new Event(VIEW_CHANGED));
            dispatch({type: actionNames.UPDATE_RESULT, payload: updatedData});
        } catch (e) {
            console.error('Error while updating references of failed tests:', e);
        }
    };
};

export const acceptTest = (suite, browserId, stateName) => {
    return acceptOpened(assign({browserId, stateName}, suite));
};

export const suiteBegin = (suite) => ({type: actionNames.SUITE_BEGIN, payload: suite});
export const testBegin = (test) => ({type: actionNames.TEST_BEGIN, payload: test});
export const testResult = (result) => ({type: actionNames.TEST_RESULT, payload: result});
export const toggleTestResult = (result) => triggerViewChanges({type: actionNames.TOGGLE_TEST_RESULT, payload: result});
export const toggleStateResult = (result) => triggerViewChanges({type: actionNames.TOGGLE_STATE_RESULT, payload: result});
export const changeTestRetry = (result) => ({type: actionNames.CHANGE_TEST_RETRY, payload: result});
export const toggleLoading = (payload) => ({type: actionNames.TOGGLE_LOADING, payload});
export const closeSections = (payload) => triggerViewChanges({type: actionNames.CLOSE_SECTIONS, payload});
export const showModal = (payload) => ({type: actionNames.SHOW_MODAL, payload});
export const hideModal = () => ({type: actionNames.HIDE_MODAL});
export const testsEnd = () => ({type: actionNames.TESTS_END});
export const runFailed = () => ({type: actionNames.RUN_FAILED_TESTS});
export const expandAll = () => ({type: actionNames.VIEW_EXPAND_ALL});
export const expandErrors = () => ({type: actionNames.VIEW_EXPAND_ERRORS});
export const expandRetries = () => ({type: actionNames.VIEW_EXPAND_RETRIES});
export const collapseAll = () => triggerViewChanges({type: actionNames.VIEW_COLLAPSE_ALL});
export const toggleSkipped = () => triggerViewChanges({type: actionNames.VIEW_TOGGLE_SKIPPED});
export const toggleOnlyDiff = () => triggerViewChanges({type: actionNames.VIEW_TOGGLE_ONLY_DIFF});
export const toggleScaleImages = () => triggerViewChanges({type: actionNames.VIEW_TOGGLE_SCALE_IMAGES});
export const toggleGroupByError = () => ({type: actionNames.VIEW_TOGGLE_GROUP_BY_ERROR});
export const toggleLazyLoad = () => ({type: actionNames.VIEW_TOGGLE_LAZY_LOAD_IMAGES});
export const updateBaseHost = (host) => {
    window.localStorage.setItem('_gemini-replace-host', host);
    return {type: actionNames.VIEW_UPDATE_BASE_HOST, host};
};

export const updateTestNameFilter = (testNameFilter) => {
    return triggerViewChanges({type: actionNames.VIEW_UPDATE_FILTER_BY_NAME, testNameFilter});
};

export function changeViewMode(mode) {
    window.dispatchEvent(new Event(VIEW_CHANGED));

    switch (mode) {
        case 'failed':
            return {type: actionNames.VIEW_SHOW_FAILED};
        default:
            return {type: actionNames.VIEW_SHOW_ALL};
    }
}

export const findSameDiffs = ({suitePath, browser, stateName, fails}) => {
    return async (dispatch) => {
        dispatch(toggleLoading({active: true, content: 'Find same diffs...'}));

        const refImagesInfo = {suitePath, browserId: browser.name, ...getRefImagesInfo({browser, stateName})};
        const refImagesInfoId = getImagesInfoId({suitePath, browserId: browser.name, stateName});

        const allOpenedImagesInfo = getAllOpenedImagesInfo(fails);
        const allOpenedImagesInfoIds = allOpenedImagesInfo.map(getImagesInfoId);

        const comparedImagesInfo = filterImagesInfo(
            allOpenedImagesInfo,
            [filterByBro(browser.name), rejectRefImagesInfo(refImagesInfoId), filterStatus(isFailStatus)]
        );

        const imagesInfoWithEqualDiffSizes = filterByEqualDiffSizes(comparedImagesInfo, refImagesInfo.diffClusters);
        let equalImages = [];

        try {
            if (isEmpty(imagesInfoWithEqualDiffSizes)) {
                const сloseImagesInfoIds = difference(allOpenedImagesInfoIds, [refImagesInfoId]);
                dispatch(closeSections(сloseImagesInfoIds));
                return;
            }

            equalImages = (await axios.post(
                '/find-equal-diffs',
                [refImagesInfo].concat(imagesInfoWithEqualDiffSizes))
            ).data;

            const сloseImagesInfoIds = difference(
                allOpenedImagesInfoIds,
                equalImages.map(getImagesInfoId).concat(refImagesInfoId)
            );

            dispatch(closeSections(сloseImagesInfoIds));
        } catch (e) {
            console.error('Error while trying to find equal diffs of failed tests:', e);
        } finally {
            dispatch(toggleLoading({active: false}));
            dispatch(showModal({
                type: modalTypes.FIND_SAME_DIFFS_MODAL,
                data: {
                    browserId: browser.name,
                    equalImages: equalImages.length,
                    comparedImages: comparedImagesInfo.length
                }
            }));
        }
    };
};

function triggerViewChanges(payload) {
    window.dispatchEvent(new Event(VIEW_CHANGED));

    return payload;
}

function formatTests(test) {
    let resultFromBrowsers = [];
    let resultFromChildren = [];

    if (test.children) {
        resultFromChildren = flatMap(test.children, formatTests);
    }

    if (test.browsers) {
        if (test.browserId) {
            test.browsers = filter(test.browsers, {name: test.browserId});
        }

        const {suitePath, name} = test;
        const prepareImages = (images, filterCond) => {
            return filter(images, filterCond)
                .filter(isAcceptable)
                .map(({actualImg, stateName}) => ({status: UPDATED, actualImg, stateName}));
        };

        resultFromBrowsers = flatMap(test.browsers, (browser) => {
            const browserResult = getOpenedBrowserResult(browser);

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

    return [...resultFromBrowsers, ...resultFromChildren];
}

// return flat list of nodes with browsers
function filterBrowsers(suites = [], filterFns) {
    const modifySuite = (suite) => {
        let resultFromBrowsers = [];
        let resultFromChildren = [];

        if (suite.children) {
            resultFromChildren = flatMap(suite.children, modifySuite);
        }

        if (suite.browsers) {
            suite.browsers = filter(suite.browsers, (bro) => {
                if (suite.browserId && suite.browserId !== bro.name) {
                    return false;
                }

                const openedBroResult = getOpenedBrowserResult(bro);

                return [].concat(filterFns).every((fn) => fn(openedBroResult));
            });
            resultFromBrowsers.push(omit(suite, 'children'));
        }

        return [...resultFromBrowsers, ...resultFromChildren];
    };

    return flatMap(cloneDeep(suites), modifySuite);
}

function filterFailedBrowsers(suites = []) {
    return filterBrowsers(suites, isSuiteFailed);
}

function filterAcceptableBrowsers(suites = []) {
    return filterBrowsers(suites, [isAcceptable, filterOpenedStateResult]);
}

function getOpenedBrowserResult({result, retries, state}) {
    return get(state, 'opened') ? retries.concat(result)[state.retryIndex] : {};
}

function filterOpenedStateResult(broResult) {
    broResult.imagesInfo = broResult.imagesInfo.filter(({opened, status}) => {
        return opened && (isFailStatus(status) || isErroredStatus(status));
    });

    return broResult.imagesInfo.length;
}
