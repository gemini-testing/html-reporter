'use strict';

const _ = require('lodash');
const {BaseTestsTreeBuilder} = require('./base');
const {UPDATED} = require('../constants/test-statuses');
const {isUpdatedStatus} = require('../common-utils');

module.exports = class GuiTestsTreeBuilder extends BaseTestsTreeBuilder {
    getLastResult(formattedResult) {
        const browserId = this._buildBrowserId(formattedResult);
        const browser = this._tree.browsers.byId[browserId];
        const testResultId = _.last(browser.resultIds);

        return this._tree.results.byId[testResultId];
    }

    getResultByOrigAttempt(formattedResult) {
        const testResultId = this._buildTestResultId(formattedResult);

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

    getResultDataToUnacceptImage(resultId, stateName) {
        const imageId = this._tree.results.byId[resultId].imageIds.find(imageId => {
            return this._tree.images.byId[imageId].stateName === stateName;
        });
        const image = this._tree.images.byId[imageId];
        const result = this._tree.results.byId[image.parentId];
        const browser = this._tree.browsers.byId[result.parentId];

        const previousResultId = browser.resultIds.find((_, ind, resultIds) => resultIds[ind + 1] === result.id);
        const previousResult = previousResultId ? this._tree.results.byId[previousResultId] : null;

        const previousImageId = previousResult
            ? previousResult.imageIds.find(imageId => this._tree.images.byId[imageId].stateName === image.stateName)
            : null;
        const previousImage = previousImageId
            ? this._tree.images.byId[previousImageId]
            : null;

        const countUpdated = result.imageIds.reduce((acc, currImageId) => {
            return acc + isUpdatedStatus(this._tree.images.byId[currImageId].status);
        }, 0);
        const shouldRemoveResult = isUpdatedStatus(image.status) && countUpdated === 1;

        return {
            imageId,
            status: image.status,
            timestamp: result.timestamp,
            previousImage,
            previousImageId,
            shouldRemoveResult
        };
    }

    reuseTestsTree(testsTree) {
        this._tree.browsers.allIds.forEach((browserId) => this._reuseBrowser(testsTree, browserId));
    }

    updateImageInfo(imageId, imageInfo) {
        const currentImage = this._tree.images.byId[imageId];
        const updatedImage = {
            ...imageInfo,
            id: currentImage.id,
            parentId: currentImage.parentId
        };

        this._tree.images.byId[imageId] = updatedImage;

        return updatedImage;
    }

    removeTestResult(resultId) {
        const result = this._tree.results.byId[resultId];

        this._removeImagesById(result.imageIds);

        this._tree.browsers.byId[result.parentId].resultIds =
            this._tree.browsers.byId[result.parentId].resultIds.filter(id => id !== resultId);

        this._tree.results.allIds = this._tree.results.allIds.filter(id => id !== resultId);

        delete this._tree.results.byId[resultId];
    }

    _removeImagesById(imageIds) {
        this._tree.images.allIds = this._tree.images.allIds.filter(id => !imageIds.includes(id));

        imageIds.forEach(imageId => {
            delete this._tree.images.byId[imageId];
        });
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

    _buildBrowserId(formattedResult) {
        const {testPath, browserId: browserName} = formattedResult;
        const suiteId = this._buildId(testPath);
        const browserId = this._buildId(suiteId, browserName);

        return browserId;
    }

    _buildTestResultId(formattedResult) {
        const browserId = this._buildBrowserId(formattedResult);

        return `${browserId} ${formattedResult.origAttempt}`;
    }
};
