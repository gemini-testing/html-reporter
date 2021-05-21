'use strict';

const _ = require('lodash');
const BaseTestsTreeBuilder = require('./base');
const {UPDATED} = require('../constants/test-statuses');

module.exports = class GuiTestsTreeBuilder extends BaseTestsTreeBuilder {
    getLastResult(formattedResult) {
        const {testPath, browserId: browserName} = formattedResult;
        const suiteId = this._buildId(testPath);
        const browserId = this._buildId(suiteId, browserName);
        const browser = this._tree.browsers.byId[browserId];
        const testResultId = _.last(browser.resultIds);

        return this._tree.results.byId[testResultId];
    }

    getImagesInfo(testId) {
        return this._tree.results.byId[testId].imageIds.map((imageId) => {
            return this._tree.images.byId[imageId];
        });
    }

    getTestBranch(id) {
        const getSuites = (suite) => {
            if (suite.root) {
                return [{id: suite.id, status: suite.status}];
            }

            return _.flatten([
                getSuites(this._tree.suites.byId[suite.parentId]),
                {id: suite.id, status: suite.status}
            ]);
        };

        const result = this._tree.results.byId[id];
        const images = result.imageIds.map((imgId) => this._tree.images.byId[imgId]);
        const browser = this._tree.browsers.byId[result.parentId];
        const suites = getSuites(this._tree.suites.byId[browser.parentId]);

        return {result, images, suites};
    }

    getTestsDataToUpdateRefs(imageIds) {
        const imagesById = [].concat(imageIds).reduce((acc, imgId) => {
            acc[imgId] = this._tree.images.byId[imgId];

            return acc;
        }, {});

        const imagesByResultId = _.groupBy(imagesById, 'parentId');

        return Object.keys(imagesByResultId).map((resultId) => {
            const result = this._tree.results.byId[resultId];
            const browser = this._tree.browsers.byId[result.parentId];
            const suite = this._tree.suites.byId[browser.parentId];

            const imagesInfo = imagesByResultId[resultId]
                .map(({stateName, actualImg}) => ({stateName, actualImg, status: UPDATED}));

            return {
                suite: {path: suite.suitePath.slice(0, -1)},
                state: {name: suite.name},
                browserId: browser.name,
                metaInfo: result.metaInfo,
                imagesInfo,
                attempt: result.attempt
            };
        });
    }

    getImageDataToFindEqualDiffs(imageIds) {
        return imageIds.map((imageId) => {
            const image = this._tree.images.byId[imageId];
            const result = this._tree.results.byId[image.parentId];
            const {name: browserName} = this._tree.browsers.byId[result.parentId];

            return {...image, browserName};
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
