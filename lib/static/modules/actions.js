'use strict';

import actionNames from './action-names';
import axios from 'axios';
import testStatuses from '../../constants/test-statuses';

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
                payload: {status: testStatuses.QUEUED}
            });
        } catch (e) {
            console.error('Failed to run all tests:', e);
        }
    };
};

export const suiteBegin = (suite) => ({type: actionNames.SUITE_BEGIN, payload: suite});
export const testBegin = (test) => ({type: actionNames.TEST_BEGIN, payload: test});
export const testResult = (result) => ({type: actionNames.TEST_RESULT, payload: result});
export const runFailed = () => ({type: actionNames.RUN_FAILED_TESTS});
export const acceptAll = () => ({type: actionNames.ACCEPT_ALL});
export const acceptSuite = () => ({type: actionNames.ACCEPT_SUITE});
export const retrySuite = () => ({type: actionNames.RETRY_SUITE});
export const expandAll = () => ({type: actionNames.VIEW_EXPAND_ALL});
export const expandErrors = () => ({type: actionNames.VIEW_EXPAND_ERRORS});
export const collapseAll = () => ({type: actionNames.VIEW_COLLAPSE_ALL});
export const toggleSkipped = () => ({type: actionNames.VIEW_TOGGLE_SKIPPED});
export const toggleRetries = () => ({type: actionNames.VIEW_TOGGLE_RETRIES});
export const toggleOnlyDiff = () => ({type: actionNames.VIEW_TOGGLE_ONLY_DIFF});
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
