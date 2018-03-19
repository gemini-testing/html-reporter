'use strict';

import axios from 'axios';
import {assign} from 'lodash';
import actionNames from './action-names';
import {QUEUED} from '../../constants/test-statuses';

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

export const runAllTests = () => {
    return async (dispatch) => {
        try {
            await axios.post('/run');
            dispatch({
                type: actionNames.RUN_ALL_TESTS,
                payload: {status: QUEUED}
            });
        } catch (e) {
            console.error('Failed to run all tests:', e);
        }
    };
};

export const runFailedTests = (fails) => {
    return async (dispatch) => {
        try {
            await axios.post('/run', fails);
            dispatch({type: actionNames.RUN_FAILED_TESTS});
        } catch (e) {
            console.error('Error while running failed tests:', e);
        }
    };
};

export const retrySuite = (suite, browserId) => {
    return runFailedTests(assign({browserId}, suite));
};

export const acceptAll = (fails, actionName = actionNames.ACCEPT_ALL) => {
    return async (dispatch) => {
        try {
            await axios.post('/update-reference', fails);
            dispatch({type: actionName});
        } catch (e) {
            console.error('Error while updating references of failed tests:', e);
        }
    };
};

export const acceptSuite = (suite, browserId, attempt) => {
    return acceptAll(assign({browserId}, suite, {attempt}), actionNames.ACCEPT_SUITE);
};

export const suiteBegin = (suite) => ({type: actionNames.SUITE_BEGIN, payload: suite});
export const testBegin = (test) => ({type: actionNames.TEST_BEGIN, payload: test});
export const testResult = (result) => ({type: actionNames.TEST_RESULT, payload: result});
export const updateResult = (result) => ({type: actionNames.UPDATE_RESULT, payload: result});
export const testsEnd = () => ({type: actionNames.TESTS_END});
export const runFailed = () => ({type: actionNames.RUN_FAILED_TESTS});
export const expandAll = () => ({type: actionNames.VIEW_EXPAND_ALL});
export const expandErrors = () => ({type: actionNames.VIEW_EXPAND_ERRORS});
export const collapseAll = () => ({type: actionNames.VIEW_COLLAPSE_ALL});
export const toggleSkipped = () => ({type: actionNames.VIEW_TOGGLE_SKIPPED});
export const toggleRetries = () => ({type: actionNames.VIEW_TOGGLE_RETRIES});
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
