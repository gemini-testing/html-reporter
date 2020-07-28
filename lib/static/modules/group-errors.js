'use strict';

import {get, filter} from 'lodash';
import {isSuiteFailed, isTestNameMatchFilters, shouldShowBrowser} from './utils';
import {isFailStatus, isErroredStatus} from '../../common-utils';
import viewModes from '../../constants/view-modes';

const imageComparisonErrorMessage = 'image comparison failed';

/**
 * @param {object} suites
 * @param {string} viewMode
 * @param {array} errorPatterns
 * @param {array} filteredBrowsers
 * @param {string} [testNameFilter]
 * @param {boolean} [strictMatchFilter]
 * @return {array}
 */
function groupErrors({suites = {}, viewMode = viewModes.ALL, errorPatterns = [], filteredBrowsers = [], testNameFilter = '', strictMatchFilter = false}) {
    const showOnlyFailed = viewMode === viewModes.FAILED;
    const filteredSuites = showOnlyFailed ? filter(suites, isSuiteFailed) : suites;
    const testWithErrors = extractErrors(filteredSuites, showOnlyFailed);
    const errorGroupsList = getErrorGroupList(testWithErrors, errorPatterns, filteredBrowsers, testNameFilter, strictMatchFilter);

    errorGroupsList.sort((a, b) => {
        const result = b.count - a.count;
        if (result === 0) {
            return a.name.localeCompare(b.name);
        }
        return result;
    });

    return errorGroupsList;
}

function extractErrors(rootSuites, showOnlyFailed) {
    const testWithErrors = {};

    const extract = (suites) => {
        for (const suite of Object.values(suites)) {
            const testName = suite.suitePath.join(' ');
            const browsersWithError = [];

            if (suite.browsers) {
                for (const browser of suite.browsers) {
                    const {status} = browser.result;
                    if (showOnlyFailed && !isFailStatus(status) && !isErroredStatus(status)) {
                        continue;
                    }
                    const retries = [...browser.retries, browser.result];
                    const errors = extractErrorsFromRetries(retries);

                    if (errors.length) {
                        browsersWithError.push({
                            browser,
                            errors
                        });
                    }
                }
            }

            if (Object.keys(browsersWithError).length) {
                testWithErrors[testName] = browsersWithError;
            }

            if (suite.children) {
                extract(suite.children);
            }
        }
    };

    extract(rootSuites);

    return testWithErrors;
}

function extractErrorsFromRetries(retries) {
    const errorsInRetry = new Set();

    for (const retry of retries) {
        for (const {error, diffImg} of [...retry.imagesInfo, retry]) {
            if (get(error, 'message')) {
                errorsInRetry.add(error.message);
            }
            if (diffImg) {
                errorsInRetry.add(imageComparisonErrorMessage);
            }
        }
    }
    return [...errorsInRetry];
}

function getErrorGroupList(testWithErrors, errorPatterns, filteredBrowsers, testNameFilter, strictMatchFilter) {
    const errorGroups = {};

    for (const [testName, browsers] of Object.entries(testWithErrors)) {
        if (!isTestNameMatchFilters(testName, testNameFilter, strictMatchFilter)) {
            continue;
        }

        for (const {browser, errors} of browsers) {
            if (!shouldShowBrowser(browser, filteredBrowsers)) {
                continue;
            }

            for (const errorText of errors) {
                const patternInfo = matchGroup(errorText, errorPatterns);
                const {pattern, name} = patternInfo;

                if (!errorGroups.hasOwnProperty(name)) {
                    errorGroups[name] = {
                        pattern,
                        name,
                        tests: {},
                        count: 0
                    };
                }
                const group = errorGroups[name];
                if (!group.tests.hasOwnProperty(testName)) {
                    group.tests[testName] = [];
                }
                if (!group.tests[testName].includes(browser.name)) {
                    group.tests[testName].push(browser.name);
                    group.count++;
                }
            }
        }
    }

    return Object.values(errorGroups);
}

function matchGroup(errorText, errorPatterns) {
    for (const group of errorPatterns) {
        if (errorText.match(group.regexp)) {
            return group;
        }
    }

    return {
        name: errorText,
        pattern: errorText
    };
}

module.exports = {groupErrors};
