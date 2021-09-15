import {last, identity, flatMap, compact, findLast} from 'lodash';
import {createSelector} from 'reselect';
import {getViewMode} from './view';
import viewModes from '../../../constants/view-modes';
import {isIdleStatus} from '../../../common-utils';
import {isNodeFailed, isNodeSuccessful, isAcceptable, iterateSuites} from '../utils';

const getSuites = (state) => state.tree.suites.byId;
const getSuitesStates = (state) => state.tree.suites.stateById;
const getBrowsers = (state) => state.tree.browsers.byId;
const getBrowsersStates = (state) => state.tree.browsers.stateById;
const getResults = (state) => state.tree.results.byId;
const getImages = (state) => state.tree.images.byId;
const getImagesStates = (state) => state.tree.images.stateById;
const getAllRootSuiteIds = (state) => state.tree.suites.allRootIds;
const getFailedRootSuiteIds = (state) => state.tree.suites.failedRootIds;
const getRootSuiteIds = (state) => {
    const viewMode = getViewMode(state);
    return viewMode === viewModes.FAILED ? state.tree.suites.failedRootIds : state.tree.suites.allRootIds;
};

const getSuiteById = (state, {suiteId}) => state.tree.suites.byId[suiteId];
const getImageById = (state, {imageId}) => state.tree.images.byId[imageId];

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

export const getFailedTests = createSelector(
    getSuites, getBrowsers, getResults, getFailedRootSuiteIds,
    (suites, browsers, results, failedRootSuiteIds) => {
        const lastResults = flatMap(failedRootSuiteIds, (suiteId) => getSuiteResults(suites[suiteId], {suites, browsers, results}, last));
        const failedLastResults = lastResults.filter((result) => isNodeFailed(result));

        return failedLastResults.map((result) => {
            const browserId = result.parentId;
            const {parentId: testName, name: browserName} = browsers[browserId];

            return {testName, browserName, metaInfo: result.metaInfo};
        });
    }
);

export const getAcceptableImagesByStateName = createSelector(
    getBrowsersStates, getBrowsers, getResults, getImages,
    (browsersStates, browsers, results, images) => {
        const getImageInfo = (image) => {
            const browser = getImageBrowser(image, browsers, results);

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

        const matchedBrowsers = Object.keys(browsersStates)
            .filter((browserId) => browsersStates[browserId].shouldBeShown)
            .map((browserId) => browsers[browserId]);

        const preparedImages = flatMap(matchedBrowsers, (browser) => getBrowserImages(browser, {results, images}))
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

const getActiveTestSuites = createSelector(
    getAllRootSuiteIds, getSuites, getSuitesStates,
    (rootSuiteIds, suites, suitesStates) => {
        const filterFn = (suite) => {
            const {shouldBeShown, shouldBeOpened} = suitesStates[suite.id];

            return shouldBeShown && shouldBeOpened;
        };

        const activeRootSuites = rootSuiteIds
            .map((rootSuiteId) => suites[rootSuiteId])
            .filter(filterFn);

        return flatMap(activeRootSuites, (rootSuite) => getTestSuites(rootSuite, {suites}, filterFn));
    }
);

const getActiveBrowsers = createSelector(
    getActiveTestSuites, getBrowsers, getBrowsersStates, getActiveTestSuites,
    (activeYoungestSuites, browsers, browsersStates) => {
        return flatMap(activeYoungestSuites, (suite) => suite.browserIds)
            .filter((browserId) => {
                const {shouldBeShown, shouldBeOpened} = browsersStates[browserId];
                return shouldBeShown && shouldBeOpened;
            })
            .map((browserId) => browsers[browserId]);
    }
);

const getActiveResults = createSelector(
    getActiveBrowsers, getBrowsersStates, getResults,
    (activeBrowsers, browsersStates, results) => {
        return activeBrowsers.map((browser) => {
            const {retryIndex} = browsersStates[browser.id];
            const resultId = browser.resultIds[retryIndex];

            return results[resultId];
        });
    }
);

const getActiveImages = createSelector(
    getActiveResults, getImages, getImagesStates,
    (activeResults, images, imagesStates) => {
        return flatMap(activeResults, (result) => {
            return result.imageIds
                .filter((imageId) => imagesStates[imageId].shouldBeOpened)
                .map((imageId) => images[imageId]);
        });
    }
);

export const getAcceptableOpenedImageIds = createSelector(
    getActiveImages,
    (activeImages) => activeImages.filter(isAcceptable).map((image) => image.id)
);

export const getFailedOpenedImageIds = createSelector(
    getActiveImages,
    (activeImages) => activeImages.filter(isNodeFailed).map((image) => image.id)
);

export const getVisibleRootSuiteIds = createSelector(
    getRootSuiteIds, getSuitesStates,
    (rootSuiteIds, suitesStates) => rootSuiteIds.filter((suiteId) => suitesStates[suiteId].shouldBeShown)
);

export function getSuiteResults(node, tree, filterFn = identity) {
    const {suites, browsers, results} = tree;

    return iterateSuites(node, {
        suiteCb: (suiteId) => getSuiteResults(suites[suiteId], tree, filterFn),
        browserCb: (browserId) => {
            return [].concat(filterFn(browsers[browserId].resultIds)).map((resultId) => results[resultId]);
        }
    });
}

function getTestSuites(suite, tree, filterFn = identity) {
    if (!filterFn(suite)) {
        return [];
    }

    return iterateSuites(suite, {
        suiteCb: (suiteId) => getTestSuites(tree.suites[suiteId], tree, filterFn),
        browserIdsCb: (_, parent) => [parent]
    });
}

function getSuiteBrowsers(suite, tree) {
    const {suites, browsers} = tree;

    if (suite.browserIds) {
        return suite.browserIds.map((browserId) => browsers[browserId]);
    }

    return flatMap(suite.suiteIds, (suiteId) => getSuiteBrowsers(suites[suiteId], tree));
}

function getBrowserImages(node, tree) {
    const {results, images} = tree;

    if (node.imageIds) {
        return [].concat(node.imageIds).map((imageId) => images[imageId]);
    }

    return flatMap(node.resultIds, (resultId) => {
        return getBrowserImages(results[resultId], tree);
    });
}

export function getFailedSuiteResults(tree) {
    const failedRootSuites = tree.suites.failedRootIds.map((suiteId) => tree.suites.byId[suiteId]);
    const failedTestSuites = compact(flatMap(failedRootSuites, (failedRootSuite) => getFailedTestSuites(failedRootSuite, tree.suites.byId)));

    return flatMap(failedTestSuites, (suite) => iterateSuites(suite, {
        browserCb: (browserId) => {
            const browser = tree.browsers.byId[browserId];
            return browser.resultIds.map((resultId) => tree.results.byId[resultId]);
        }
    }));
}

function getFailedTestSuites(suite, suites) {
    if (!isNodeFailed(suite)) {
        return [];
    }

    return iterateSuites(suite, {
        suiteCb: (suiteId) => getFailedTestSuites(suites[suiteId], suites),
        browserIdsCb: (_, parent) => [parent]
    });
}

function getLastImageByStateName(image, browsers, results, images) {
    const browser = getImageBrowser(image, browsers, results);
    const allBrowserImages = flatMap(browser.resultIds, (resultId) => {
        return results[resultId].imageIds.map((imgId) => images[imgId]);
    });

    return findLast(allBrowserImages, {stateName: image.stateName});
}

function getImageBrowser(image, browsers, results) {
    const result = results[image.parentId];
    return browsers[result.parentId];
}

export const areAllRootSuitesIdle = createSelector(
    getAllRootSuiteIds, getSuites,
    (allRootSuiteIds, suites) => {
        return !allRootSuiteIds.some((id) => !isIdleStatus(suites[id].status));
    }
);
