import {last, initial, identity, flatMap, isEmpty, find, compact, findLast} from 'lodash';
import {createSelector} from 'reselect';
import {getFilteredBrowsers, getTestNameFilter, getStrictMatchFilter, getViewMode} from './view';
import viewModes from '../../../constants/view-modes';
import {isFailStatus, isErroredStatus, isIdleStatus} from '../../../common-utils';
import {isNodeFailed, isNodeSuccessful, isAcceptable} from '../utils';

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
const getBrowserIds = (state) => state.tree.browsers.allIds;

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
    getBrowserIds, getBrowsers, getResults, getImages, getFilteredBrowsers,
    (browserIds, browsers, results, images, filteredBrowsers) => {
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

        const matchedBrowsers = browserIds
            .map((browserId) => browsers[browserId])
            .filter((browser) => shouldShowBrowser(browser, filteredBrowsers));

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

export const mkGetVisibleRootSuiteIds = () => createSelector(
    getRootSuiteIds, getSuites, getBrowsers, getErrorGroupBrowserIds,
    getTestNameFilter, getStrictMatchFilter, getFilteredBrowsers, getViewMode,
    (rootSuiteIds, suites, ...args) => {
        return rootSuiteIds.filter((suiteId) => shouldSuiteBeShown(suites[suiteId], suites, ...args));
    }
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

function shouldSuiteBeShown(suite, suites, browsers, errorGroupBrowserIds, testNameFilter, strictMatchFilter, filteredBrowsers, viewMode) {
    if (!isStatusMatchViewMode(suite.status, viewMode)) {
        return false;
    }

    const suiteBrowsers = getSuiteBrowsers(suite, {suites, browsers});

    return suiteBrowsers.some((browser) => {
        const testName = browser.parentId;

        if (!isTestNameMatchFilters(testName, testNameFilter, strictMatchFilter)) {
            return false;
        }

        return shouldShowBrowser(browser, filteredBrowsers, errorGroupBrowserIds);
    });
}

export const mkShouldBrowserBeShown = () => createSelector(
    getBrowserById, getResultStatus, getErrorGroupBrowserIds, getFilteredBrowsers, getViewMode,
    (browser, lastResultStatus, errorGroupBrowserIds, filteredBrowsers, viewMode) => {
        if (!isStatusMatchViewMode(lastResultStatus, viewMode)) {
            return false;
        }

        return shouldShowBrowser(browser, filteredBrowsers, errorGroupBrowserIds);
    }
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

function isStatusMatchViewMode(status, viewMode) {
    if (viewMode === viewModes.ALL) {
        return true;
    }

    if (viewMode === viewModes.FAILED && isFailStatus(status) || isErroredStatus(status)) {
        return true;
    }

    return false;
}

function isTestNameMatchFilters(testName, testNameFilter, strictMatchFilter) {
    if (!testNameFilter) {
        return true;
    }

    return strictMatchFilter ? testName === testNameFilter : testName.includes(testNameFilter);
}

export function shouldShowBrowser(browser, filteredBrowsers, errorGroupBrowserIds = []) {
    if (isEmpty(filteredBrowsers) && isEmpty(errorGroupBrowserIds)) {
        return true;
    }

    const browserToFilterBy = filteredBrowsers.length === 0 || find(filteredBrowsers, {id: browser.name});
    const matchErrorGroup = errorGroupBrowserIds.length === 0 || errorGroupBrowserIds.includes(browser.id);

    if (!browserToFilterBy || !matchErrorGroup) {
        return false;
    }

    const browserVersionsToFilterBy = [].concat(browserToFilterBy.versions).filter(Boolean);

    if (isEmpty(browserVersionsToFilterBy)) {
        return true;
    }

    return browserVersionsToFilterBy.includes(browser.version);
}

export function getFailedSuiteResults(tree) {
    const failedRootSuites = tree.suites.failedRootIds.map((suiteId) => tree.suites.byId[suiteId]);
    const failedTestSuites = compact(flatMap(failedRootSuites, (failedRootSuite) => getFailedTestSuites(failedRootSuite, tree.suites.byId)));
    const preparedTree = {suites: tree.suites.byId, browsers: tree.browsers.byId, results: tree.results.byId};

    return flatMap(failedTestSuites, (suite) => getSuiteResults(suite, preparedTree));
}

function getFailedTestSuites(suite, suites) {
    if (!isNodeFailed(suite)) {
        return;
    }

    if (suite.browserIds) {
        return suite;
    }

    return flatMap(suite.suiteIds, (suiteId) => getFailedTestSuites(suites[suiteId], suites));
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
