'use strict';

const testStatus = require('../../constants/test-statuses');
const columns = require('./db-column-names');
const url = require('url');
const {forOwn, pick, isArray, find, get, values, isEmpty} = require('lodash');

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

function isDbSuiteFailed(suite) {
    return isFailStatus(suite[columns.status]) || isErroredStatus(suite[columns.status]);
}

function isAcceptable({status, error}) {
    return isErroredStatus(status) && isNoRefImageError(error) || isFailStatus(status);
}

function hasRetries(node) {
    const isRetried = node.retries && node.retries.length;
    return isRetried || walk(node, hasRetries);
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
    if (filteredBrowsers.length === 0 || !stats.perBrowser) {
        return stats.all;
    }

    const resStats = {};
    const neededBrowserStats = pick(stats.perBrowser, filteredBrowsers);

    values(neededBrowserStats).forEach((browserStat) => {
        forOwn(browserStat, (value, key) => {
            if (resStats[key] === undefined) {
                resStats[key] = value;
            } else {
                resStats[key] += value;
            }
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

function shouldSuiteBeShown({suite, testNameFilter = '', filteredBrowsers = [], errorGroupTests = {}}) {
    const strictTestNameFilters = Object.keys(errorGroupTests);

    // suite may contain children and browsers
    if (suite.hasOwnProperty('children')) {
        const shouldChildrenBeShown = suite.children.some(child =>
            shouldSuiteBeShown({
                suite: child,
                testNameFilter,
                errorGroupTests,
                filteredBrowsers
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

    const matchName = !testNameFilter || suiteFullPath.includes(testNameFilter);

    const strictMatchNames = strictTestNameFilters.length === 0
        || strictTestNameFilters.includes(suiteFullPath);

    const matchBrowsers = filteredBrowsers.length === 0
        || suite.browsers.some(({name}) => filteredBrowsers.includes(name));

    return matchName && strictMatchNames && matchBrowsers;
}

function shouldBrowserBeShown({browser, fullTestName, filteredBrowsers = [], errorGroupTests = {}}) {
    const {name} = browser;
    let errorGroupBrowsers = [];

    if (errorGroupTests && errorGroupTests.hasOwnProperty(fullTestName)) {
        errorGroupBrowsers = errorGroupTests[fullTestName];
    }

    const matchFilteredBrowsers = filteredBrowsers.length === 0 || filteredBrowsers.includes(name);
    const matchErrorGroupBrowsers = errorGroupBrowsers.length === 0 || errorGroupBrowsers.includes(name);

    return matchFilteredBrowsers && matchErrorGroupBrowsers;
}

function isUrl(str) {
    if (typeof str !== 'string') {
        return false;
    }

    const parsedUrl = url.parse(str);

    return parsedUrl.host && parsedUrl.protocol;
}

function sortByTimeStamp(suite1, suite2) {
    if (suite1[columns.timestamp] < suite2[columns.timestamp]) {
        return -1;
    }
    if (suite1[columns.timestamp] > suite2[columns.timestamp]) {
        return 1;
    }
    return 0;
}

function updateSuitesStats(stats, status, attemptInfo) {
    const {suitePath, browserName} = attemptInfo;
    const attemptId = suitePath.join('') + browserName;

    if (!stats.perBrowser[browserName]) {
        stats.perBrowser[browserName] = {total: 0, passed: 0, failed: 0, skipped: 0, retries: 0};
    }
    switch (status) {
        case testStatus.FAIL:
        case testStatus.ERROR: {
            if (stats.failedTestIds[attemptId]) {
                stats.retries++;
                stats.perBrowser[browserName].retries++;
                return;
            }
            stats.failedTestIds[attemptId] = true;
            stats.failed++;
            stats.total++;
            stats.perBrowser[browserName].failed++;
            stats.perBrowser[browserName].total++;
            return;
        }
        case testStatus.SUCCESS: {
            if (stats.passedTestIds[attemptId]) {
                stats.retries++;
                stats.perBrowser[browserName].retries++;
                return;
            }
            if (stats.failedTestIds[attemptId]) {
                delete stats.failedTestIds[attemptId];
                stats.failed--;
                stats.passed++;
                stats.retries++;
                stats.perBrowser[browserName].failed--;
                stats.perBrowser[browserName].passed++;
                stats.perBrowser[browserName].retries++;
                return;
            }
            stats.passedTestIds[attemptId] = true;
            stats.passed++;
            stats.total++;
            stats.perBrowser[browserName].passed++;
            stats.perBrowser[browserName].total++;
            return;
        }
        case testStatus.SKIPPED: {
            stats.skipped++;
            if (stats.failedTestIds[attemptId]) {
                delete stats.failedTestIds[attemptId];
                stats.failed--;
                stats.perBrowser[browserName].failed--;
                return;
            }
            stats.total++;
            stats.perBrowser[browserName].total++;
        }
    }
}

function isSqlite(saveFormat) {
    return saveFormat === 'sqlite';
}

module.exports = {
    isNoRefImageError,
    hasNoRefImageErrors,
    hasFails,
    isSuiteIdle,
    isSuiteSuccessful,
    isSuiteFailed,
    isDbSuiteFailed,
    isAcceptable,
    hasRetries,
    allSkipped,
    findNode,
    setStatusToAll,
    setStatusForBranch,
    getStats,
    dateToLocaleString,
    shouldSuiteBeShown,
    shouldBrowserBeShown,
    isUrl,
    sortByTimeStamp,
    updateSuitesStats,
    isSqlite
};
