'use strict';

const _ = require('lodash');
const BaseTestsTreeBuilder = require('./base');

module.exports = class GuiTestsTreeBuilder extends BaseTestsTreeBuilder {
    getLastResult(formattedResult) {
        const {testPath, browserId: browserName} = formattedResult;
        const suiteId = this._buildId(testPath);
        const browserId = this._buildId(suiteId, browserName);
        const browser = this._tree.browsers.byId[browserId];
        const testResultId = _.last(browser.resultIds);

        return this._tree.results.byId[testResultId];
    }

    getImagesInfo(formattedResult) {
        const {testPath, browserId: browserName, attempt} = formattedResult;
        const suiteId = this._buildId(testPath);
        const browserId = this._buildId(suiteId, browserName);
        const testResultId = this._buildId(browserId, attempt);

        return this._tree.results.byId[testResultId].imageIds.map((imageId) => {
            return this._tree.images.byId[imageId];
        });
    }

    reuseTestsTree(testsTree) {
        this._tree.browsers.allIds.forEach((browserId) => this._reuseBrowser(testsTree, browserId));
    }

    _reuseBrowser(testsTree, browserId) {
        const reuseBrowser = testsTree.browsers.byId[browserId];

        if (!reuseBrowser) {
            return;
        }

        this._tree.browsers.byId[browserId] = reuseBrowser;

        reuseBrowser.resultIds.forEach((resultId) => this._reuseResults(testsTree, resultId));
        this._reuseSuiteStatus(testsTree, this._tree.browsers.byId[browserId].parentId);
    }

    _reuseResults(testsTree, resultId) {
        const reuseResult = testsTree.results.byId[resultId];

        if (!this._tree.results.byId[resultId]) {
            this._tree.results.allIds.push(resultId);
        }

        this._tree.results.byId[resultId] = reuseResult;

        reuseResult.imageIds.forEach((imageId) => this._reuseImages(testsTree, imageId));
    }

    _reuseImages(testsTree, imageId) {
        const reuseImage = testsTree.images.byId[imageId];

        if (!this._tree.images.byId[imageId]) {
            this._tree.images.allIds.push(imageId);
        }

        this._tree.images.byId[imageId] = reuseImage;
    }

    _reuseSuiteStatus(testsTree, suiteId) {
        if (!suiteId) {
            return;
        }

        const suite = this._tree.suites.byId[suiteId];
        suite.status = testsTree.suites.byId[suiteId].status;

        this._reuseSuiteStatus(testsTree, suite.parentId);
    }
};
