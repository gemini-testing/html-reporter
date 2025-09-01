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
import {ViewMode, SECTIONS, RESULT_KEYS, KEY_DELIMITER, NEW_ISSUE_LINK} from '../../../constants';
import {applyStateUpdate, ensureDiffProperty, getUpdatedProperty} from './state';

export {applyStateUpdate, ensureDiffProperty, getUpdatedProperty};

const AVAILABLE_GROUP_SECTIONS = Object.values(SECTIONS);

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
    return isErrorStatus(status) && (isNoRefImageError(error) || isInvalidRefImageError(error)) || isFailStatus(status) || isSkippedStatus(status);
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

export function legacyIsTestNameMatch(testName, browserName, testNameFilter, strictMatchFilter) {
    if (!testNameFilter) {
        return true;
    }

    const filterRegExpStr = testNameFilter.replace(/ /g, '(?: | › )');

    return strictMatchFilter
        ? new RegExp(`^${filterRegExpStr}$`).test(testName)
        : new RegExp(filterRegExpStr).test(`${testName} ${browserName}`);
}

export function matchTestName(
    testName, browserName, testNameFilter, {strictMatchFilter, useMatchCaseFilter = false, useRegexFilter = false, isNewUi = true} = {}
) {
    if (!testNameFilter) {
        return true;
    }

    // For old UI, we use old search logic, because old ui doesn't support ranking by relevance
    if (!isNewUi) {
        return legacyIsTestNameMatch(testName, browserName, testNameFilter, strictMatchFilter);
    }

    const flags = useMatchCaseFilter ? '' : 'i';
    if (useRegexFilter) {
        try {
            const regex = new RegExp(testNameFilter, flags);

            return regex.test(testName) || regex.test(`${testName} ${browserName}`);
        } catch (e) {
            return false;
        }
    }

    if (strictMatchFilter) {
        const escapedFilter = testNameFilter.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const filterRegExpStr = `^${escapedFilter.replace(/ /g, '(?: | › )')}$`;

        try {
            const regex = new RegExp(filterRegExpStr, flags);
            return regex.test(testName) || regex.test(`${testName} ${browserName}`);
        } catch (e) {
            console.warn(`An error occurred while comparing test name in strict mode: ${filterRegExpStr}. Please file an issue at ${NEW_ISSUE_LINK}`);
            return false;
        }
    }

    return false;
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

export async function getBlobWithRetires(url, retriesCount = 3) {
    let retriesLeft = retriesCount;

    while (retriesLeft >= 0) {
        retriesLeft--;

        try {
            return await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                xhr.onload = () => resolve(xhr.response);
                xhr.onerror = () => reject(new Error(`Got an error trying to download object at: ${url}`));

                xhr.open('GET', url);
                xhr.responseType = 'blob';
                xhr.send();
            });
        } catch (err) {
            if (retriesLeft < 0) {
                throw err;
            }

            const retriesProcessed = retriesCount - retriesLeft;
            const sleepTimeoutMs = 500 * 2 ** retriesProcessed; // exponential retries. Timeouts: 1s, 2s, 4s ...

            await new Promise(resolve => setTimeout(resolve, sleepTimeoutMs));
        }
    }
}

/**
 * Converts text between English and Russian keyboard layouts.
 * Useful when text was typed with the wrong keyboard layout.
 */
export function keyboardLayoutConverter(text) {
    if (!text) {
        return '';
    }

    const enChars = '`qwertyuiop[]\\asdfghjkl;\'zxcvbnm,.~QWERTYUIOP{}|ASDFGHJKL:"ZXCVBNM<>?';
    const ruChars = 'ёйцукенгшщзхъ\\фывапролджэячсмитьбюЁЙЦУКЕНГШЩЗХЪ|ФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,';

    let sourceChars, targetChars;
    let layoutDetermined = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (enChars.includes(char)) {
            sourceChars = enChars;
            targetChars = ruChars;
            layoutDetermined = true;
            break;
        } else if (ruChars.includes(char)) {
            sourceChars = ruChars;
            targetChars = enChars;
            layoutDetermined = true;
            break;
        }
    }

    if (!layoutDetermined) {
        return text;
    }

    let result = '';

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const idx = sourceChars.indexOf(char);

        if (idx >= 0) {
            result += targetChars[idx];
        } else {
            result += char;
        }
    }

    return result;
}
