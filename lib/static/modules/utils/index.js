'use strict';

import {isEmpty, find, isFunction, flatMap} from 'lodash';
import {
    isIdleStatus,
    isSuccessStatus,
    isUpdatedStatus,
    isFailStatus,
    isErrorStatus,
    isSkippedStatus,
    isNoRefImageError,
    isStagedStatus,
    isCommitedStatus,
    isInvalidRefImageError
} from '../../../common-utils';
import {ViewMode, SECTIONS, RESULT_KEYS, KEY_DELIMITER} from '../../../constants';
import default_ from './state';
const {applyStateUpdate, ensureDiffProperty, getUpdatedProperty} = default_;

const AVAILABLE_GROUP_SECTIONS = Object.values(SECTIONS);

export {applyStateUpdate, ensureDiffProperty, getUpdatedProperty};

export function isSuiteIdle(suite) {
    return isIdleStatus(suite.status);
}

export function isSuiteSuccessful(suite) {
    return isSuccessStatus(suite.status);
}

export function isNodeFailed(node) {
    return isFailStatus(node.status) || isErrorStatus(node.status);
}

export function isNodeStaged(node) {
    return isStagedStatus(node.status);
}

export function isNodeSuccessful(node) {
    return isSuccessStatus(node.status) || isUpdatedStatus(node.status) || isStagedStatus(node.status) || isCommitedStatus(node.status);
}

/**
 * @param {Object} params
 * @param {string} params.status
 * @param {Object} [params.error]
 * @returns {boolean}
 */
export function isAcceptable({status, error}) {
    return isErrorStatus(status) && isNoRefImageError(error) || isFailStatus(status) || isSkippedStatus(status) || isInvalidRefImageError(error);
}

function isScreenGuiRevertable({gui, image, isLastResult}) {
    return gui && image.stateName && isLastResult && isUpdatedStatus(image.status);
}

function isScreenStaticUnstageable({gui, image, isStaticImageAccepterEnabled}) {
    return !gui && isStaticImageAccepterEnabled && image.stateName && isStagedStatus(image.status);
}

export function isScreenRevertable({gui, image, isLastResult, isStaticImageAccepterEnabled}) {
    return isScreenGuiRevertable({gui, image, isLastResult}) || isScreenStaticUnstageable({gui, image, isStaticImageAccepterEnabled});
}

export function dateToLocaleString(date) {
    if (!date) {
        return '';
    }
    const lang = isEmpty(navigator.languages) ? navigator.language : navigator.languages[0];
    return new Date(date).toLocaleString(lang);
}

export function getHttpErrorMessage(error) {
    const {message, response} = error;

    return response ? `(${response.status}) ${response.data}` : message;
}

export function isTestNameMatchFilters(testName, browserName, testNameFilter, strictMatchFilter) {
    if (!testNameFilter) {
        return true;
    }

    const filterRegExpStr = testNameFilter.replace(/ /g, '(?: | › )');

    return strictMatchFilter
        ? new RegExp(`^${filterRegExpStr}$`).test(testName)
        : new RegExp(filterRegExpStr).test(`${testName} ${browserName}`);
}

export function isBrowserMatchViewMode(browser, lastResultStatus, viewMode, diff = browser) {
    if (viewMode === ViewMode.ALL) {
        return true;
    }

    if (viewMode === ViewMode.PASSED && isSuccessStatus(lastResultStatus)) {
        return true;
    }

    if (viewMode === ViewMode.FAILED && (isFailStatus(lastResultStatus) || isErrorStatus(lastResultStatus))) {
        return true;
    }

    if (viewMode === ViewMode.RETRIED) {
        return getUpdatedProperty(browser, diff, 'resultIds.length') > 1;
    }

    return lastResultStatus === viewMode;
}

export function shouldShowBrowser(browser, filteredBrowsers, diff = browser) {
    if (isEmpty(filteredBrowsers)) {
        return true;
    }

    const browserToFilterBy = find(filteredBrowsers, {id: getUpdatedProperty(browser, diff, 'name')});

    if (!browserToFilterBy) {
        return false;
    }

    const browserVersionsToFilterBy = [].concat(browserToFilterBy.versions).filter(Boolean);

    if (isEmpty(browserVersionsToFilterBy)) {
        return true;
    }

    return browserVersionsToFilterBy.includes(getUpdatedProperty(browser, diff, 'version'));
}

export function iterateSuites(node, {suiteCb, browserCb, browserIdsCb}) {
    let resultFromBrowsers = [];
    let resultFromSuites = [];

    if (node.browserIds && [browserCb, browserIdsCb].some(isFunction)) {
        resultFromBrowsers = browserIdsCb
            ? browserIdsCb(node.browserIds, node)
            : flatMap(node.browserIds, (browserId) => browserCb(browserId, node));
    }

    if (node.suiteIds && isFunction(suiteCb)) {
        resultFromSuites = flatMap(node.suiteIds, (suiteId) => suiteCb(suiteId, node));
    }

    return [...resultFromBrowsers, ...resultFromSuites];
}

export function parseKeyToGroupTestsBy(key) {
    let [groupSection, ...groupKey] = key.split(KEY_DELIMITER);
    groupKey = groupKey.join(KEY_DELIMITER);

    if (!AVAILABLE_GROUP_SECTIONS.includes(groupSection)) {
        throw new Error(`Group section must be one of ${AVAILABLE_GROUP_SECTIONS.join(', ')}, but got ${groupSection}`);
    }

    if (groupSection === SECTIONS.RESULT && !RESULT_KEYS.includes(groupKey)) {
        throw new Error(`Group key must be one of ${RESULT_KEYS.join(', ')}, but got ${groupKey}`);
    }

    return [groupSection, groupKey];
}

export function preloadImage(url) {
    new Image().src = url;
}

export function getBlob(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject(new Error(`Got an error trying to download object at: ${url}`));

        xhr.open('GET', url);
        xhr.responseType = 'blob';
        xhr.send();
    });
}

export default {
    applyStateUpdate,
    ensureDiffProperty,
    getUpdatedProperty,
    isSuiteIdle,
    isSuiteSuccessful,
    isNodeFailed,
    isNodeStaged,
    isNodeSuccessful,
    isAcceptable,
    isScreenRevertable,
    dateToLocaleString,
    getHttpErrorMessage,
    isTestNameMatchFilters,
    isBrowserMatchViewMode,
    shouldShowBrowser,
    iterateSuites,
    parseKeyToGroupTestsBy,
    preloadImage,
    getBlob
};
