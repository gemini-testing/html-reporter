'use strict';

const _ = require('lodash');
const {determineStatus} = require('../common-utils');

module.exports = class ResultsTreeBuilder {
    static create() {
        return new this();
    }

    constructor() {
        this._tree = {
            suites: {byId: {}, allIds: [], allRootIds: []},
            browsers: {byId: {}, allIds: []},
            results: {byId: {}, allIds: []},
            images: {byId: {}, allIds: []}
        };
    }

    get tree() {
        return this._tree;
    }

    sortTree() {
        const sortChildSuites = (suiteId) => {
            const childSuite = this._tree.suites.byId[suiteId];

            if (childSuite.suiteIds) {
                childSuite.suiteIds.sort().forEach(sortChildSuites);
            }

            if (childSuite.browserIds) {
                childSuite.browserIds.sort();
            }
        };

        this._tree.suites.allRootIds.sort().forEach(sortChildSuites);
    }

    addTestResult(testResult, formattedResult) {
        const {testPath, browserId: browserName, attempt} = formattedResult;
        const {imagesInfo} = testResult;

        const suiteId = this._buildId(testPath);
        const browserId = this._buildId(suiteId, browserName);
        const testResultId = this._buildId(browserId, attempt);
        const imageIds = imagesInfo
            .map((image, i) => this._buildId(testResultId, image.stateName || `${image.status}_${i}`));

        this._addSuites(testPath, browserId);
        this._addBrowser({id: browserId, parentId: suiteId, name: browserName}, testResultId, attempt);
        this._addResult({id: testResultId, parentId: browserId, result: testResult}, imageIds);
        this._addImages(imageIds, {imagesInfo, parentId: testResultId});

        this._setStatusForBranch(testPath);
    }

    _buildId(parentId = [], name = []) {
        return [].concat(parentId, name).join(' ');
    }

    _addSuites(testPath, browserId) {
        testPath.reduce((suites, name, ind, arr) => {
            const isRoot = ind === 0;
            const suitePath = isRoot ? [name] : arr.slice(0, ind + 1);
            const id = this._buildId(suitePath);

            if (!suites.byId[id]) {
                const parentId = isRoot ? null : this._buildId(suitePath.slice(0, -1));
                const suite = {id, parentId, name, suitePath, root: isRoot};

                this._addSuite(suite);
            }

            if (ind !== arr.length - 1) {
                const childSuiteId = this._buildId(id, arr[ind + 1]);
                this._addChildSuiteId(id, childSuiteId);
            } else {
                this._addBrowserId(id, browserId);
            }

            return suites;
        }, this._tree.suites);
    }

    _addSuite(suite) {
        const {suites} = this._tree;

        suites.byId[suite.id] = suite;
        suites.allIds.push(suite.id);

        if (suite.root) {
            suites.allRootIds.push(suite.id);
        }
    }

    _addChildSuiteId(parentSuiteId, childSuiteId) {
        const {suites} = this._tree;

        if (!suites.byId[parentSuiteId].suiteIds) {
            suites.byId[parentSuiteId].suiteIds = [childSuiteId];
            return;
        }

        if (!this._isChildSuiteIdExists(parentSuiteId, childSuiteId)) {
            suites.byId[parentSuiteId].suiteIds.push(childSuiteId);
        }
    }

    _isChildSuiteIdExists(parentSuiteId, childSuiteId) {
        return _.includes(this._tree.suites.byId[parentSuiteId].suiteIds, childSuiteId);
    }

    _addBrowserId(parentSuiteId, browserId) {
        const {suites} = this._tree;

        if (!suites.byId[parentSuiteId].browserIds) {
            suites.byId[parentSuiteId].browserIds = [browserId];
            return;
        }

        if (!this._isBrowserIdExists(parentSuiteId, browserId)) {
            suites.byId[parentSuiteId].browserIds.push(browserId);
        }
    }

    _isBrowserIdExists(parentSuiteId, browserId) {
        return _.includes(this._tree.suites.byId[parentSuiteId].browserIds, browserId);
    }

    _addBrowser({id, parentId, name}, testResultId, attempt) {
        const {browsers} = this._tree;

        if (!browsers.byId[id]) {
            browsers.byId[id] = {id, parentId, name, resultIds: []};
            browsers.allIds.push(id);
        }

        this._addResultIdToBrowser(id, testResultId, attempt);
    }

    _addResultIdToBrowser(browserId, testResultId, attempt) {
        this._tree.browsers.byId[browserId].resultIds[attempt] = testResultId;
    }

    _addResult({id, parentId, result}, imageIds) {
        const resultWithoutImagesInfo = _.omit(result, 'imagesInfo');

        if (!this._tree.results.byId[id]) {
            this._tree.results.allIds.push(id);
        }

        this._tree.results.byId[id] = {id, parentId, ...resultWithoutImagesInfo, imageIds};
    }

    _addImages(imageIds, {imagesInfo, parentId}) {
        imageIds.forEach((id, ind) => {
            this._tree.images.byId[id] = {id, parentId, ...imagesInfo[ind]};
            this._tree.images.allIds.push(id);
        });
    }

    _setStatusForBranch(testPath = []) {
        const suiteId = this._buildId(testPath);

        if (!suiteId) {
            return;
        }

        const suite = this._tree.suites.byId[suiteId];

        const resultStatuses = _.compact([].concat(suite.browserIds))
            .map((browserId) => {
                const browser = this._tree.browsers.byId[browserId];
                const lastResultId = _.last(browser.resultIds);

                return this._tree.results.byId[lastResultId].status;
            });

        const childrenSuiteStatuses = _.compact([].concat(suite.suiteIds))
            .map((childSuiteId) => this._tree.suites.byId[childSuiteId].status);

        const status = determineStatus([...resultStatuses, ...childrenSuiteStatuses]);

        // if newly determined status is the same as current status, do nothing
        if (suite.status === status) {
            return;
        }

        suite.status = status;
        this._setStatusForBranch(testPath.slice(0, -1));
    }

    convertToOldFormat() {
        const tree = {children: []};
        const {suites} = this._tree;

        suites.allRootIds.forEach((rootSuiteId) => {
            const suite = this._convertSuiteToOldFormat(_.clone(suites.byId[rootSuiteId]));
            tree.children.push(suite);
        });

        return {suites: tree.children};
    }

    _convertSuiteToOldFormat(suite) {
        if (suite.suiteIds) {
            suite.children = suite.suiteIds.map((childSuiteId) => {
                const childSuite = _.clone(this._tree.suites.byId[childSuiteId]);
                const result = this._convertSuiteToOldFormat(childSuite);

                return result;
            });
        }

        if (suite.browserIds) {
            suite.browsers = suite.browserIds.map((browserId) => {
                const browser = _.clone(this._tree.browsers.byId[browserId]);
                return this._convertBrowserToOldFormat(browser);
            });
        }

        delete suite.suiteIds;
        delete suite.browserIds;
        delete suite.id;
        delete suite.parentId;
        delete suite.root;

        return suite;
    }

    _convertBrowserToOldFormat(browser) {
        browser.retries = browser.resultIds.slice(0, -1).map((resultId) => {
            const result = _.clone(this._tree.results.byId[resultId]);
            return this._convertImagesToOldFormat(result);
        });

        const resultId = _.last(browser.resultIds);
        browser.result = _.clone(this._tree.results.byId[resultId]);
        this._convertImagesToOldFormat(browser.result);

        delete browser.resultIds;
        delete browser.id;
        delete browser.parentId;

        return browser;
    }

    _convertImagesToOldFormat(result) {
        result.imagesInfo = result.imageIds.map((imageId) => {
            const image = _.clone(this._tree.images.byId[imageId]);

            delete image.id;
            delete image.parentId;

            return image;
        });

        delete result.imageIds;
        delete result.id;
        delete result.parentId;

        return result;
    }
};
