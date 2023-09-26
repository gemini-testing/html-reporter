'use strict';

const {get, isEmpty, find, isFunction, flatMap, isPlainObject, isUndefined} = require('lodash');
const {isIdleStatus, isSuccessStatus, isUpdatedStatus, isFailStatus, isErrorStatus, isSkippedStatus} = require('../../common-utils');
const {getCommonErrors} = require('../../constants/errors');
const {ViewMode} = require('../../constants/view-modes');
const {SECTIONS, RESULT_KEYS, KEY_DELIMITER} = require('../../constants/group-tests');

const AVAILABLE_GROUP_SECTIONS = Object.values(SECTIONS);
const {NO_REF_IMAGE_ERROR, ASSERT_VIEW_ERROR} = getCommonErrors();

function hasFailedImages(result) {
    const {imagesInfo = []} = result;

    return imagesInfo.some(({error, status}) => !isAssertViewError(error) && (isErrorStatus(status) || isFailStatus(status)));
}

function isNoRefImageError(error) {
    const stack = get(error, 'stack', '');
    return stack.startsWith(NO_REF_IMAGE_ERROR);
}

function isAssertViewError(error) {
    const stack = get(error, 'stack', '');
    return stack.startsWith(ASSERT_VIEW_ERROR);
}

function hasNoRefImageErrors({imagesInfo = []}) {
    return Boolean(imagesInfo.filter(({error}) => isNoRefImageError(error)).length);
}

function hasResultFails(testResult) {
    return hasFailedImages(testResult) || isErrorStatus(testResult.status) || isFailStatus(testResult.status);
}

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

    return strictMatchFilter
        ? testName === testNameFilter
        : testName.includes(testNameFilter);
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

function applyStateUpdate(state, diff) {
    const result = {...state};

    for (const key in diff) {
        if (isPlainObject(diff[key]) && isPlainObject(state[key])) {
            result[key] = applyStateUpdate(state[key], diff[key]);
        } else if (diff[key] !== undefined) {
            result[key] = diff[key];
        } else {
            delete result[key];
        }
    }

    return result;
}

function ensureDiffProperty(diff, path) {
    let state = diff;

    for (let i = 0; i < path.length; i++) {
        const property = path[i];

        state[property] = state[property] || {};

        state = state[property];
    }
}

function getUpdatedProperty(state, diff, path) {
    const diffValue = get(diff, path);

    return isUndefined(diffValue) ? get(state, path) : diffValue;
}

module.exports = {
    isNoRefImageError,
    isAssertViewError,
    hasNoRefImageErrors,
    hasResultFails,
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
    preloadImage,
    applyStateUpdate,
    ensureDiffProperty,
    getUpdatedProperty
};
