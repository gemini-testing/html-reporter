import {last, initial, identity, flatMap, findLast} from 'lodash';
import {createSelector} from 'reselect';
import {getFilteredBrowsers, getTestNameFilter, getStrictMatchFilter, getViewMode} from './view';
import viewModes from '../../../constants/view-modes';
import {isFailStatus, isErroredStatus, isIdleStatus} from '../../../common-utils';
import {isNodeFailed, isNodeSuccessful, isAcceptable} from '../utils';

import {shouldSuiteBeShown, shouldBrowserBeShown} from './helpers';

const getSuites = (state) => state.tree.suites.byId;
const getBrowsers = (state) => state.tree.browsers.byId;
const getResults = (state) => state.tree.results.byId;
const getImages = (state) => state.tree.images.byId;
const getAllRootSuiteIds = (state) => state.tree.suites.allRootIds;
const getFailedRootSuiteIds = (state) => state.tree.suites.failedRootIds;
const getImagesStates = (state) => state.tree.images.stateById;
const getRootSuiteIds = (state) => {
    const viewMode = getViewMode(state);
    return viewMode === viewModes.FAILED ? state.tree.suites.failedRootIds : state.tree.suites.allRootIds;
};
const getImageIds = (state) => state.tree.images.allIds;

const getSuiteById = (state, {suiteId}) => state.tree.suites.byId[suiteId];
const getBrowserById = (state, {browserId}) => state.tree.browsers.byId[browserId];
const getImageById = (state, {imageId}) => state.tree.images.byId[imageId];
const getResultStatus = (state, {result}) => result.status;
const getErrorGroupBrowserIds = (state, {errorGroupBrowserIds} = {}) => errorGroupBrowserIds;

export const getFailedTests = createSelector(
    getSuites, getBrowsers, getResults, getFailedRootSuiteIds,
    (suites, browsers, results, failedRootSuiteIds) => {
        const lastResults = flatMap(failedRootSuiteIds, (suiteId) => getSuiteResults(suites[suiteId], {suites, browsers, results}, last));
        const failedLastResults = lastResults.filter((result) => isNodeFailed(result));

        return failedLastResults.map((result) => {
            const browserId = result.parentId;
            const {parentId: testName, name: browserName} = browsers[browserId];

            return {testName, browserName};
        });
    }
);

export const mkGetTestsBySuiteId = () => createSelector(
    getSuiteById, getSuites, getBrowsers,
    (suite, suites, browsers) => {
        const suiteBrowsers = getSuiteBrowsers(suite, {suites, browsers});

        return suiteBrowsers.map(({parentId, name}) => ({testName: parentId, browserName: name}));
    }
);

export const mkGetLastImageByStateName = () => createSelector(
    getImageById, getBrowsers, getResults, getImages,
    getLastImageByStateName
);

export const getAcceptableImagesByStateName = createSelector(
    getImageIds, getBrowsers, getResults, getImages,
    (imageIds, browsers, results, images) => {
        const getImageInfo = (image) => {
            const result = results[image.parentId];
            const browser = browsers[result.parentId];

            return {suiteId: browser.parentId, browserName: browser.name};
        };

        const sortImages = (imgA, imgB) => {
            const {suiteId: suiteIdA, browserName: browserNameA} = getImageInfo(imgA);
            const {suiteId: suiteIdB, browserName: browserNameB} = getImageInfo(imgB);

            const compareSuiteIdsRes = suiteIdA.localeCompare(suiteIdB);

            return compareSuiteIdsRes === 0
                ? browserNameA.localeCompare(browserNameB)
                : compareSuiteIdsRes;
        };

        const preparedImages = imageIds
            .map((imgId) => images[imgId])
            .filter(isAcceptable)
            .sort(sortImages);

        return preparedImages.reduce((acc, image) => {
            const lastImage = getLastImageByStateName(image, browsers, results, images);

            if (isNodeSuccessful(lastImage)) {
                return acc;
            }

            const result = results[image.parentId];
            const stateNameId = `${result.parentId} ${image.stateName}`;

            if (acc[stateNameId]) {
                acc[stateNameId].push(image);
            } else {
                acc[stateNameId] = [image];
            }

            return acc;
        }, {});
    }
);

export const getOpenedImageIds = createSelector(
    getImagesStates,
    (imagesStates) => Object.keys(imagesStates).filter((imgId) => imagesStates[imgId].opened)
);

export const getAcceptableOpenedImageIds = createSelector(
    getOpenedImageIds, getImages,
    (openedImageIds, images) => {
        return openedImageIds.map((imgId) => images[imgId]).filter(isAcceptable).map((image) => image.id);
    }
);

export const getFailedOpenedImageIds = createSelector(
    getOpenedImageIds, getImages,
    (openedImageIds, images) => {
        return openedImageIds.map((imgId) => images[imgId]).filter(isNodeFailed).map((image) => image.id);
    }
);

export const getVisibleRootSuiteIds = (rootSuiteIds, suites, ...args) => {
    return rootSuiteIds.filter((suiteId) => shouldSuiteBeShown(suites[suiteId], suites, ...args));
};

export const mkGetVisibleRootSuiteIds = () => createSelector(
    getRootSuiteIds, getSuites, getBrowsers, getErrorGroupBrowserIds,
    getTestNameFilter, getStrictMatchFilter, getFilteredBrowsers, getViewMode,
    getVisibleRootSuiteIds
);

export const mkHasSuiteFailedRetries = () => createSelector(
    getSuiteById, getSuites, getBrowsers, getResults,
    (suite, suites, browsers, results) => {
        const retries = getSuiteResults(suite, {suites, browsers, results}, initial);

        return retries.some((retry) => isNodeFailed(retry));
    }
);

export const mkHasBrowserFailedRetries = () => createSelector(
    getBrowserById, getResults,
    (browser, results) => {
        const retries = [].concat(initial(browser.resultIds)).map((resultId) => results[resultId]);

        return retries.some((retry) => isNodeFailed(retry));
    }
);

export const mkShouldSuiteBeShown = () => createSelector(
    getSuiteById, getSuites, getBrowsers, getErrorGroupBrowserIds,
    getTestNameFilter, getStrictMatchFilter, getFilteredBrowsers, getViewMode,
    shouldSuiteBeShown
);

export const mkShouldBrowserBeShown = () => createSelector(
    getBrowserById, getResultStatus, getErrorGroupBrowserIds, getFilteredBrowsers, getViewMode,
    shouldBrowserBeShown
);

function getSuiteResults(node, tree, filterFn = identity) {
    const {suites, browsers, results} = tree;

    if (node.resultIds) {
        return [].concat(filterFn(node.resultIds)).map((resultId) => results[resultId]);
    }

    if (node.browserIds) {
        return flatMap(node.browserIds, (browserId) => {
            return getSuiteResults(browsers[browserId], tree, filterFn);
        });
    }

    return flatMap(node.suiteIds, (suiteId) => getSuiteResults(suites[suiteId], tree, filterFn));
}

export function getSuiteBrowsers(suite, tree) {
    const {suites, browsers} = tree;

    if (suite.browserIds) {
        return suite.browserIds.map((browserId) => browsers[browserId]);
    }

    return flatMap(suite.suiteIds, (suiteId) => getSuiteBrowsers(suites[suiteId], tree));
}

export function isStatusMatchViewMode(status, viewMode) {
    if (viewMode === viewModes.ALL) {
        return true;
    }

    // noinspection RedundantIfStatementJS
    if (viewMode === viewModes.FAILED && isFailStatus(status) || isErroredStatus(status)) {
        return true;
    }

    return false;
}

function getLastImageByStateName(image, browsers, results, images) {
    const result = results[image.parentId];
    const browser = browsers[result.parentId];
    const allBrowserImages = flatMap(browser.resultIds, (resultId) => {
        return results[resultId].imageIds.map((imgId) => images[imgId]);
    });

    return findLast(allBrowserImages, {stateName: image.stateName});
}

export const areAllRootSuitesIdle = createSelector(
    getAllRootSuiteIds, getSuites,
    (allRootSuiteIds, suites) => {
        return !allRootSuiteIds.some((id) => !isIdleStatus(suites[id].status));
    }
);
