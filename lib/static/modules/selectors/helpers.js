import {find, isEmpty} from 'lodash';
import {isStatusMatchViewMode, getSuiteBrowsers} from './tree';

export function shouldBrowserBeShown(browser, lastResultStatus, errorGroupBrowserIds, filteredBrowsers, viewMode) {
    if (!isBrowserMatchViewMode(browser, lastResultStatus, viewMode)) {
        return false;
    }

    return shouldShowBrowser(browser, filteredBrowsers, errorGroupBrowserIds);
}

export function shouldSuiteBeShown(suite, suites, browsers, errorGroupBrowserIds, testNameFilter, strictMatchFilter, filteredBrowsers, viewMode) {
    if (!isSuiteMatchViewMode(suite, viewMode)) {
        return false;
    }

    const suiteBrowsers = getSuiteBrowsers(suite, {suites, browsers});

    return suiteBrowsers.some((browser) => {
        const testName = browser.parentId;

        if (!isTestNameMatchFilters(testName, testNameFilter, strictMatchFilter)) {
            return false;
        }

        return shouldShowBrowser(browser, filteredBrowsers, errorGroupBrowserIds);
    });
}

export function isBrowserMatchViewMode(browser, lastResultStatus, viewMode) {
    return isStatusMatchViewMode(lastResultStatus, viewMode);
}

export function isSuiteMatchViewMode(suite, viewMode) {
    return isStatusMatchViewMode(suite.status, viewMode);
}

export function shouldShowBrowser(browser, filteredBrowsers, errorGroupBrowserIds = []) {
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
}

function isTestNameMatchFilters(testName, testNameFilter, strictMatchFilter) {
    if (!testNameFilter) {
        return true;
    }

    return strictMatchFilter ? testName === testNameFilter : testName.includes(testNameFilter);
}
