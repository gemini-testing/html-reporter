'use strict';

const {find, isEmpty} = require('lodash');
const {isStatusMatchViewMode, getSuiteBrowsers} = require('./tree');

exports.shouldBrowserBeShown = (browser, lastResultStatus, errorGroupBrowserIds, filteredBrowsers, viewMode) => {
    if (!exports.isBrowserMatchViewMode(browser, lastResultStatus, viewMode)) {
        return false;
    }

    return exports.shouldShowBrowser(browser, filteredBrowsers, errorGroupBrowserIds);
};

exports.shouldSuiteBeShown = (suite, suites, browsers, errorGroupBrowserIds, testNameFilter, strictMatchFilter, filteredBrowsers, viewMode) => {
    if (!exports.isSuiteMatchViewMode(suite, suites, browsers, viewMode)) {
        return false;
    }

    const suiteBrowsers = getSuiteBrowsers(suite, {suites, browsers});

    return suiteBrowsers.some((browser) => {
        const testName = browser.parentId;

        if (!exports.isTestNameMatchFilters(testName, testNameFilter, strictMatchFilter)) {
            return false;
        }

        return exports.shouldShowBrowser(browser, filteredBrowsers, errorGroupBrowserIds);
    });
};

exports.isBrowserMatchViewMode = (browser, lastResultStatus, viewMode) => {
    return isStatusMatchViewMode(lastResultStatus, viewMode);
};

exports.isSuiteMatchViewMode = (suite, suites, browsers, viewMode) => {
    return isStatusMatchViewMode(suite.status, viewMode);
};

exports.shouldShowBrowser = (browser, filteredBrowsers, errorGroupBrowserIds = []) => {
    if (isEmpty(filteredBrowsers) && isEmpty(errorGroupBrowserIds)) {
        return true;
    }

    const browserToFilterBy = filteredBrowsers.length === 0 || find(filteredBrowsers, {id: browser.name});
    const matchErrorGroup = errorGroupBrowserIds.length === 0 || errorGroupBrowserIds.includes(browser.id);

    if (!browserToFilterBy || !matchErrorGroup) {
        return false;
    }

    const browserVersionsToFilterBy = [].concat(browserToFilterBy.versions).filter(Boolean);

    if (isEmpty(browserVersionsToFilterBy)) {
        return true;
    }

    return browserVersionsToFilterBy.includes(browser.version);
};

exports.isTestNameMatchFilters = (testName, testNameFilter, strictMatchFilter) => {
    if (!testNameFilter) {
        return true;
    }

    return strictMatchFilter ? testName === testNameFilter : testName.includes(testNameFilter);
};

// code smell
exports.groupErrors = (obj) => require('../group-errors').groupErrors(obj); // cyclic dep fix
