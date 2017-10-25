'use strict';

import actionNames from './action-names';

const localStorage = window.localStorage;

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
