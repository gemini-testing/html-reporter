'use strict';

const {config: {defaultView}} = require('../../constants/defaults');
const viewModes = require('../../constants/view-modes');
const {versions: BrowserVersions} = require('../../constants/browser');

const url = require('url');
const {isArray, isObject, find, get, values, isEmpty, forEach, flatten, keys} = require('lodash');

const {
    isIdleStatus,
    isSuccessStatus,
    isFailStatus,
    isErroredStatus,
    isSkippedStatus,
    determineStatus
} = require('../../common-utils');

const {getCommonErrors} = require('../../constants/errors');

const {NO_REF_IMAGE_ERROR} = getCommonErrors();

function hasFailedImages(result) {
    const {imagesInfo = []} = result;

    return imagesInfo.some(({status}) => isErroredStatus(status) || isFailStatus(status));
}

function isNoRefImageError(error) {
    const stack = get(error, 'stack', '');
    return stack.startsWith(NO_REF_IMAGE_ERROR);
}

function hasNoRefImageErrors({imagesInfo = []}) {
    return Boolean(imagesInfo.filter(({error}) => isNoRefImageError(error)).length);
}

function hasFails(node) {
    const {result} = node;

    const isFailed = result && (
        hasFailedImages(result) || isErroredStatus(result.status) || isFailStatus(result.status)
    );

    return isFailed || walk(node, hasFails);
}

function isSuiteIdle(suite) {
    return isIdleStatus(suite.status);
}

function isSuiteSuccessful(suite) {
    return isSuccessStatus(suite.status);
}

function isSuiteFailed(suite) {
    return isFailStatus(suite.status) || isErroredStatus(suite.status);
}

function isAcceptable({status, error}) {
    return isErroredStatus(status) && isNoRefImageError(error) || isFailStatus(status) || isSkippedStatus(status);
}

function hasFailedRetries(node) {
    // TODO: remove filtering out nulls in retries after fix
    const isRetried = (node.retries || []).filter(isObject).some(isSuiteFailed);
    return isRetried || walk(node, hasFailedRetries);
}

function allSkipped(node) {
    const {result} = node;
    const isSkipped = result && isSkippedStatus(result.status);

    return Boolean(isSkipped || walk(node, allSkipped, Array.prototype.every));
}

function walk(node, cb, fn = Array.prototype.some) {
    return node.browsers && fn.call(node.browsers, cb) || node.children && fn.call(node.children, cb);
}

function setStatusToAll(node, status) {
    if (isArray(node)) {
        node.forEach((n) => setStatusToAll(n, status));
    }

    const currentStatus = get(node, 'result.status', node.status);
    if (isSkippedStatus(currentStatus)) {
        return;
    }
    node.result
        ? (node.result.status = status)
        : node.status = status;

    return walk(node, (n) => setStatusToAll(n, status), Array.prototype.forEach);
}

function findNode(node, suitePath) {
    suitePath = suitePath.slice();

    if (!node.children) {
        node = values(node);
        const tree = {
            name: 'root',
            children: node
        };
        return findNode(tree, suitePath);
    }

    const pathPart = suitePath.shift();
    const child = find(node.children, {name: pathPart});

    if (!child) {
        return;
    }

    if (child.name === pathPart && !suitePath.length) {
        return child;
    }

    return findNode(child, suitePath);
}

function setStatusForBranch(nodes, suitePath) {
    const node = findNode(nodes, suitePath);
    if (!node) {
        return;
    }

    const statusesBrowser = node.browsers
        ? node.browsers.map(({result: {status}}) => status)
        : [];

    const statusesChildren = node.children
        ? node.children.map(({status}) => status)
        : [];

    const status = determineStatus([...statusesBrowser, ...statusesChildren]);

    // if newly determined status is the same as current status, do nothing
    if (node.status === status) {
        return;
    }

    node.status = status;
    setStatusForBranch(nodes, suitePath.slice(0, -1));
}

function getStats(stats, filteredBrowsers) {
    if (isEmpty(filteredBrowsers) || isEmpty(stats.perBrowser)) {
        return stats.all;
    }

    const resStats = {};
    const rows = filteredBrowsers.map((browserToFilterBy) => {
        const {id, versions} = browserToFilterBy;

        return isEmpty(versions)
            ? keys(stats.perBrowser[id]).map((ver) => stats.perBrowser[id][ver])
            : versions.map((ver) => stats.perBrowser[id][ver]);
    });

    flatten(rows).forEach((stats) => {
        forEach(stats, (value, stat) => {
            resStats[stat] = resStats[stat] === undefined
                ? value
                : resStats[stat] + value;
        });
    });

    return resStats;
}

function dateToLocaleString(date) {
    if (!date) {
        return '';
    }
    const lang = isEmpty(navigator.languages) ? navigator.language : navigator.languages[0];
    return new Date(date).toLocaleString(lang);
}

function isStatusMatchViewMode(status, viewMode) {
    if (viewMode === viewModes.ALL) {
        return true;
    }

    if (viewMode === viewModes.FAILED && isFailStatus(status) || isErroredStatus(status)) {
        return true;
    }

    return false;
}

function shouldSuiteBeShown({
    suite,
    testNameFilter = '',
    strictMatchFilter = false,
    filteredBrowsers = [],
    errorGroupTests = {},
    viewMode = defaultView
}) {
    if (!isStatusMatchViewMode(suite.status, viewMode)) {
        return false;
    }

    const strictTestNameFilters = Object.keys(errorGroupTests);

    // suite may contain children and browsers
    if (suite.hasOwnProperty('children')) {
        const shouldChildrenBeShown = suite.children.some(child =>
            shouldSuiteBeShown({
                suite: child,
                testNameFilter,
                strictMatchFilter,
                errorGroupTests,
                filteredBrowsers,
                viewMode
            })
        );

        if (shouldChildrenBeShown) {
            return true;
        }
    }

    if (!suite.hasOwnProperty('browsers')) {
        return false;
    }

    const suiteFullPath = suite.suitePath.join(' ');
    const matchName = isTestNameMatchFilters(suiteFullPath, testNameFilter, strictMatchFilter);
    const strictMatchNames = strictTestNameFilters.length === 0 || strictTestNameFilters.includes(suiteFullPath);
    const shouldShowSuite = () => {
        if (isEmpty(filteredBrowsers)) {
            return true;
        }

        return suite.browsers.some((browser) => {
            const browserResultStatus = get(browser, 'result.status');
            const shouldShowForViewMode = isStatusMatchViewMode(browserResultStatus, viewMode);

            if (!shouldShowForViewMode) {
                return false;
            }

            return shouldShowBrowser(browser, filteredBrowsers);
        });
    };

    return matchName && strictMatchNames && shouldShowSuite();
}

function shouldBrowserBeShown({
    browser,
    fullTestName,
    filteredBrowsers = [],
    errorGroupTests = {},
    viewMode = defaultView
}) {
    if (!isStatusMatchViewMode(get(browser, 'result.status'), viewMode)) {
        return false;
    }

    const {name} = browser;
    let errorGroupBrowsers = [];

    if (errorGroupTests && errorGroupTests.hasOwnProperty(fullTestName)) {
        errorGroupBrowsers = errorGroupTests[fullTestName];
    }

    const matchErrorGroupBrowsers = errorGroupBrowsers.length === 0 || errorGroupBrowsers.includes(name);

    return shouldShowBrowser(browser, filteredBrowsers) && matchErrorGroupBrowsers;
}

function shouldShowBrowser(browser, filteredBrowsers) {
    if (isEmpty(filteredBrowsers)) {
        return true;
    }

    const browserToFilterBy = find(filteredBrowsers, {id: browser.name});

    if (!browserToFilterBy) {
        return false;
    }

    const browserVersionsToFilterBy = []
        .concat(browserToFilterBy.versions)
        .filter(Boolean);

    if (isEmpty(browserVersionsToFilterBy)) {
        return true;
    }

    const browserVersion = get(browser, 'result.metaInfo.browserVersion', BrowserVersions.UNKNOWN);

    return browserVersionsToFilterBy.includes(browserVersion);
}

function filterSuites(suites = [], filteredBrowsers = []) {
    if (isEmpty(filteredBrowsers) || isEmpty(suites)) {
        return suites;
    }

    const filteredSuites = suites.filter((suite) => {
        let result = false;
        let browserStatuses = [];

        if (suite.browsers) {
            suite.browsers = suite.browsers.filter(({name}) => filteredBrowsers.includes(name));
            browserStatuses = suite.browsers.map(({result: {status}}) => status);

            result = result || suite.browsers.length > 0;
        }

        let childrenStatuses = [];

        if (suite.children) {
            suite.children = filterSuites(suite.children, filteredBrowsers);
            childrenStatuses = suite.children.map(({status}) => status);

            result = result || suite.children.length > 0;
        }

        suite.status = determineStatus([...browserStatuses, ...childrenStatuses]);

        return result;
    });

    return filteredSuites;
}

function isUrl(str) {
    if (typeof str !== 'string') {
        return false;
    }

    const parsedUrl = url.parse(str);

    return parsedUrl.host && parsedUrl.protocol;
}

function isTestNameMatchFilters(testName, testNameFilter, strictMatchFilter) {
    if (!testNameFilter) {
        return true;
    }

    return strictMatchFilter
        ? testName === testNameFilter
        : testName.includes(testNameFilter);
}

function getHttpErrorMessage(error) {
    const {message, response} = error;

    return response ? `(${response.status}) ${response.data}` : message;
}

module.exports = {
    isNoRefImageError,
    hasNoRefImageErrors,
    hasFails,
    isSuiteIdle,
    isSuiteSuccessful,
    isSuiteFailed,
    isAcceptable,
    hasFailedRetries,
    allSkipped,
    findNode,
    setStatusToAll,
    setStatusForBranch,
    getStats,
    dateToLocaleString,
    shouldSuiteBeShown,
    shouldBrowserBeShown,
    isUrl,
    filterSuites,
    isTestNameMatchFilters,
    getHttpErrorMessage,
    shouldShowBrowser
};
