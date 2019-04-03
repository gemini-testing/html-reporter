'use strict';

const {get} = require('lodash');
const {isSuccessStatus} = require('../../common-utils');

/**
 * @param {object} suites
 * @param {array} errorPatterns
 * @param {array} filteredBrowsers
 * @param {string} [testNameFilter]
 * @return {array}
 */
function groupErrors({suites, errorPatterns = [], filteredBrowsers = [], testNameFilter = ''}) {
    const testWithErrors = extractErrors(suites);

    const errorGroupsList = getErrorGroupList(testWithErrors, errorPatterns, filteredBrowsers, testNameFilter);

    errorGroupsList.sort((a, b) => {
        const result = b.count - a.count;
        if (result === 0) {
            return a.name.localeCompare(b.name);
        }
        return result;
    });

    return errorGroupsList;
}

function extractErrors(rootSuites) {
    const testWithErrors = {};

    const extract = (suites) => {
        for (const suite of Object.values(suites)) {
            const testName = suite.suitePath.join(' ');
            const browsersWithError = {};

            if (suite.browsers) {
                for (const browser of suite.browsers) {
                    if (isSuccessStatus(browser.result.status)) {
                        continue;
                    }
                    const retries = [...browser.retries, browser.result];
                    const errorsInBrowser = extractErrorsFromRetries(retries);
                    if (errorsInBrowser.length) {
                        browsersWithError[browser.name] = errorsInBrowser;
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
                errorsInRetry.add('image comparison failed');
            }
        }
    }
    return [...errorsInRetry];
}

function getErrorGroupList(testWithErrors, errorPatterns, filteredBrowsers, testNameFilter) {
    const errorGroups = {};
    const errorPatternsWithRegExp = addRegExpToErrorPatterns(errorPatterns);

    for (const [testName, browsers] of Object.entries(testWithErrors)) {
        if (testNameFilter && !testName.includes(testNameFilter)) {
            continue;
        }

        for (const [browserName, errors] of Object.entries(browsers)) {
            if (filteredBrowsers.length !== 0 && !filteredBrowsers.includes(browserName)) {
                continue;
            }
            for (const errorText of errors) {
                const patternInfo = matchGroup(errorText, errorPatternsWithRegExp);
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
                if (!group.tests[testName].includes(browserName)) {
                    group.tests[testName].push(browserName);
                    group.count++;
                }
            }
        }
    }

    return Object.values(errorGroups);
}

function addRegExpToErrorPatterns(errorPatterns) {
    return errorPatterns.map(patternInfo => ({
        ...patternInfo,
        regexp: new RegExp(patternInfo.pattern)
    }));
}

function matchGroup(errorText, errorPatternsWithRegExp) {
    for (const group of errorPatternsWithRegExp) {
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
