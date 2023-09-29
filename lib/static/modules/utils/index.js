'use strict';

const {isEmpty, find, isFunction, flatMap} = require('lodash');
const {isIdleStatus, isSuccessStatus, isUpdatedStatus, isFailStatus, isErrorStatus, isSkippedStatus, isNoRefImageError} = require('../../../common-utils');
const {ViewMode, SECTIONS, RESULT_KEYS, KEY_DELIMITER} = require('../../../constants');
const {applyStateUpdate, ensureDiffProperty, getUpdatedProperty} = require('./state');

const AVAILABLE_GROUP_SECTIONS = Object.values(SECTIONS);

function isSuiteIdle(suite) {
    return isIdleStatus(suite.status);
}

function isSuiteSuccessful(suite) {
    return isSuccessStatus(suite.status);
}

function isNodeFailed(node) {
    return isFailStatus(node.status) || isErrorStatus(node.status);
}

function isNodeSuccessful(node) {
    return isSuccessStatus(node.status) || isUpdatedStatus(node.status);
}

function isAcceptable({status, error}) {
    return isErrorStatus(status) && isNoRefImageError(error) || isFailStatus(status) || isSkippedStatus(status);
}

function isScreenRevertable({gui, image, isLastResult}) {
    return gui && image.stateName && isLastResult && isUpdatedStatus(image.status);
}

function dateToLocaleString(date) {
    if (!date) {
        return '';
    }
    const lang = isEmpty(navigator.languages) ? navigator.language : navigator.languages[0];
    return new Date(date).toLocaleString(lang);
}

function getHttpErrorMessage(error) {
    const {message, response} = error;

    return response ? `(${response.status}) ${response.data}` : message;
}

function isTestNameMatchFilters(testName, testNameFilter, strictMatchFilter) {
    if (!testNameFilter) {
        return true;
    }

    const filterRegExpStr = testNameFilter.replace(/ /g, '(?: | › )');

    return strictMatchFilter
        ? new RegExp(`^${filterRegExpStr}$`).test(testName)
        : new RegExp(filterRegExpStr).test(testName);
}

function isBrowserMatchViewMode(browser, lastResult, viewMode, diff = browser) {
    const {status} = lastResult;

    if (viewMode === ViewMode.ALL) {
        return true;
    }

    if (viewMode === ViewMode.PASSED && isSuccessStatus(status)) {
        return true;
    }

    if (viewMode === ViewMode.FAILED && (isFailStatus(status) || isErrorStatus(status))) {
        return true;
    }

    if (viewMode === ViewMode.RETRIED) {
        return getUpdatedProperty(browser, diff, 'resultIds.length') > 1;
    }

    return status === viewMode;
}

function shouldShowBrowser(browser, filteredBrowsers, diff = browser) {
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

function iterateSuites(node, {suiteCb, browserCb, browserIdsCb}) {
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

function parseKeyToGroupTestsBy(key) {
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

function preloadImage(url) {
    new Image().src = url;
}

module.exports = {
    applyStateUpdate,
    ensureDiffProperty,
    getUpdatedProperty,
    isSuiteIdle,
    isSuiteSuccessful,
    isNodeFailed,
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
    preloadImage
};
