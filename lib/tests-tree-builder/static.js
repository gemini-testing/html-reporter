'use strict';

const _ = require('lodash');
const BaseTestsTreeBuilder = require('./base');
const {dbColumnIndexes} = require('../common-utils');
const testStatus = require('../constants/test-statuses');
const {versions: browserVersions} = require('../constants/browser');

module.exports = class StaticTestsTreeBuilder extends BaseTestsTreeBuilder {
    constructor() {
        super();

        this._stats = {
            ...initStats(),
            perBrowser: {}
        };
        this._skips = [];
        this._failedBrowserIds = {};
        this._passedBrowserIds = {};
    }

    build(rows = [], opts = {convertToOldFormat: true}) {
        // in order to sync attempts between gui tree and static tree
        const attemptsMap = new Map();
        const browsers = {};

        for (const row of rows) {
            const testPath = JSON.parse(row[dbColumnIndexes.suitePath]);
            const browserName = row[dbColumnIndexes.name];

            const testId = this._buildId(testPath);
            const browserId = this._buildId(testId, browserName);

            attemptsMap.set(browserId, attemptsMap.has(browserId) ? attemptsMap.get(browserId) + 1 : 0);
            const attempt = attemptsMap.get(browserId);

            const testResult = mkTestResult(row, {attempt});
            const formattedResult = {browserId: browserName, testPath, attempt};

            addBrowserVersion(browsers, testResult);

            this.addTestResult(testResult, formattedResult);
            this._calcStats(testResult, {testId, browserId, browserName});
        }

        this.sortTree();

        return {
            tree: opts.convertToOldFormat ? this.convertToOldFormat() : this.tree,
            stats: this._stats,
            skips: this._skips,
            browsers: _.map(browsers, (versions, id) => ({id, versions: Array.from(versions)}))
        };
    }

    _addResultIdToBrowser(browserId, testResultId) {
        this._tree.browsers.byId[browserId].resultIds.push(testResultId);
    }

    _calcStats(testResult, {testId, browserId, browserName}) {
        const {status} = testResult;
        const {browserVersion} = testResult.metaInfo;
        const version = browserVersion || browserVersions.UNKNOWN;

        if (!this._stats.perBrowser[browserName]) {
            this._stats.perBrowser[browserName] = {};
        }

        if (!this._stats.perBrowser[browserName][version]) {
            this._stats.perBrowser[browserName][version] = initStats();
        }

        switch (status) {
            case testStatus.FAIL:
            case testStatus.ERROR: {
                if (this._failedBrowserIds[browserId]) {
                    this._stats.retries++;
                    this._stats.perBrowser[browserName][version].retries++;
                    return;
                }

                this._failedBrowserIds[browserId] = true;
                this._stats.failed++;
                this._stats.total++;
                this._stats.perBrowser[browserName][version].failed++;
                this._stats.perBrowser[browserName][version].total++;
                return;
            }

            case testStatus.SUCCESS: {
                if (this._passedBrowserIds[browserId]) {
                    this._stats.retries++;
                    this._stats.perBrowser[browserName][version].retries++;
                    return;
                }

                if (this._failedBrowserIds[browserId]) {
                    delete this._failedBrowserIds[browserId];
                    this._stats.failed--;
                    this._stats.passed++;
                    this._stats.retries++;
                    this._stats.perBrowser[browserName][version].failed--;
                    this._stats.perBrowser[browserName][version].passed++;
                    this._stats.perBrowser[browserName][version].retries++;

                    return;
                }

                this._passedBrowserIds[browserId] = true;
                this._stats.passed++;
                this._stats.total++;
                this._stats.perBrowser[browserName][version].passed++;
                this._stats.perBrowser[browserName][version].total++;

                return;
            }

            case testStatus.SKIPPED: {
                this._skips.push({
                    browser: browserName,
                    suite: testId,
                    comment: testResult.skipReason
                });

                this._stats.skipped++;
                this._stats.perBrowser[browserName][version].skipped++;

                if (this._failedBrowserIds[browserId]) {
                    delete this._failedBrowserIds[browserId];
                    this._stats.failed--;
                    this._stats.perBrowser[browserName][version].failed--;
                    return;
                }

                this._stats.total++;
                this._stats.perBrowser[browserName][version].total++;
            }
        }
    }
};

function initStats() {
    return {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        retries: 0
    };
}

function mkTestResult(row, data = {}) {
    return {
        description: row[dbColumnIndexes.description],
        imagesInfo: JSON.parse(row[dbColumnIndexes.imagesInfo]),
        metaInfo: JSON.parse(row[dbColumnIndexes.metaInfo]),
        multipleTabs: Boolean(row[dbColumnIndexes.multipleTabs]),
        name: row[dbColumnIndexes.name],
        screenshot: Boolean(row[dbColumnIndexes.screenshot]),
        status: row[dbColumnIndexes.status],
        suiteUrl: row[dbColumnIndexes.suiteUrl],
        skipReason: row[dbColumnIndexes.skipReason],
        error: JSON.parse(row[dbColumnIndexes.error]),
        ...data
    };
}

function addBrowserVersion(browsers, testResult) {
    const browserId = testResult.name;

    if (!browsers[browserId]) {
        browsers[browserId] = new Set();
    }

    const {browserVersion = browserVersions.UNKNOWN} = testResult.metaInfo;
    browsers[browserId].add(browserVersion);
}
