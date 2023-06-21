'use strict';

const _ = require('lodash');
const {determineStatus} = require('../common-utils');
const {versions: browserVersions} = require('../constants/browser');

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
        const {browserVersion = browserVersions.UNKNOWN} = testResult.metaInfo;

        const suiteId = this._buildId(testPath);
        const browserId = this._buildId(suiteId, browserName);
        const testResultId = this._buildId(browserId, attempt);
        const imageIds = imagesInfo
            .map((image, i) => this._buildId(testResultId, image.stateName || `${image.status}_${i}`));

        this._addSuites(testPath, browserId);
        this._addBrowser({id: browserId, parentId: suiteId, name: browserName, version: browserVersion}, testResultId, attempt);
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
                this._addNodeId(id, childSuiteId, {fieldName: 'suiteIds'});
            } else {
                this._addNodeId(id, browserId, {fieldName: 'browserIds'});
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

    _addNodeId(parentSuiteId, nodeId, {fieldName}) {
        const {suites} = this._tree;

        if (!suites.byId[parentSuiteId][fieldName]) {
            suites.byId[parentSuiteId][fieldName] = [nodeId];
            return;
        }

        if (!this._isNodeIdExists(parentSuiteId, nodeId, {fieldName})) {
            suites.byId[parentSuiteId][fieldName].push(nodeId);
        }
    }

    _isNodeIdExists(parentSuiteId, nodeId, {fieldName}) {
        return _.includes(this._tree.suites.byId[parentSuiteId][fieldName], nodeId);
    }

    _addBrowser({id, parentId, name, version}, testResultId, attempt) {
        const {browsers} = this._tree;

        if (!browsers.byId[id]) {
            browsers.byId[id] = {id, parentId, name, resultIds: [], version};
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
            this._tree.images.byId[id] = {...imagesInfo[ind], id, parentId};
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
};
