import {findLast} from 'lodash';
import {produce} from 'immer';
import actionNames from '../../action-names';
import {
    initSuitesState, changeAllSuitesState, changeSuiteState, updateSuitesStatus, getFailedRootSuiteIds,
    updateAllSuitesStatus, calcSuitesShowness, calcSuitesOpenness, failSuites, updateParentsChecked
} from './nodes/suites';
import {
    initBrowsersState, changeAllBrowsersState, changeBrowserState, getBrowserParentId,
    calcBrowsersShowness, calcBrowsersOpenness, setBrowsersLastRetry
} from './nodes/browsers';
import {initResultsState, changeAllResultsState, changeResultState, addResult, removeResult} from './nodes/results';
import {
    initImagesState, changeAllImagesState, changeImageState, addImages, calcImagesOpenness
} from './nodes/images';
import viewModes from '../../../../constants/view-modes';
import {EXPAND_RETRIES} from '../../../../constants/expand-modes';
import {FAIL} from '../../../../constants/test-statuses';
import {isSuccessStatus} from '../../../../common-utils';

export default produce((state, action) => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT: {
            const {tree} = action.payload;
            const {filteredBrowsers} = state.view;

            state.tree = tree;
            state.tree.suites.failedRootIds = getFailedRootSuiteIds(tree.suites);

            state.tree.suites.stateById = {};
            state.tree.browsers.stateById = {};
            state.tree.results.stateById = {};
            state.tree.images.stateById = {};

            updateAllSuitesStatus(state.tree, filteredBrowsers);
            initNodesStates(state);

            break;
        }

        case actionNames.RUN_ALL_TESTS: {
            const {status} = action.payload;
            const {tree} = state;

            tree.suites.allIds.forEach((suiteId) => {
                tree.suites.byId[suiteId].status = status;
            });

            break;
        }

        case actionNames.TEST_BEGIN: {
            [].concat(action.payload).forEach(({result, suites}) => {
                addResult(state.tree, result);
                setBrowsersLastRetry(state.tree, result.parentId);
                updateSuitesStatus(state.tree, suites);
            });

            break;
        }

        case actionNames.TEST_RESULT:
        case actionNames.ACCEPT_OPENED_SCREENSHOTS:
        case actionNames.ACCEPT_SCREENSHOT:
        case actionNames.APPLY_DELAYED_TEST_RESULTS: {
            addNodesToTree(state, action.payload);

            break;
        }

        case actionNames.TOGGLE_SUITE_SECTION: {
            const {suiteId, shouldBeOpened} = action.payload;

            changeSuiteState(state.tree, suiteId, {shouldBeOpened});

            break;
        }

        case actionNames.TOGGLE_BROWSER_SECTION: {
            const {browserId, shouldBeOpened} = action.payload;

            changeBrowserState(state.tree, browserId, {shouldBeOpened});

            break;
        }

        case actionNames.TOGGLE_STATE_RESULT: {
            const {imageId, shouldBeOpened} = action.payload;

            changeImageState(state.tree, imageId, {shouldBeOpened});

            break;
        }

        case actionNames.CHANGE_TEST_RETRY: {
            const {browserId, retryIndex} = action.payload;
            const browserState = {retryIndex};

            if (state.view.keyToGroupTestsBy) {
                browserState.lastMatchedRetryIndex = null;
            }

            changeBrowserState(state.tree, browserId, browserState);

            break;
        }

        case actionNames.BROWSERS_SELECTED: {
            const {tree, view} = state;

            updateAllSuitesStatus(tree, view.filteredBrowsers);
            calcBrowsersShowness(tree, view);
            calcSuitesShowness(tree);

            break;
        }

        case actionNames.CHANGE_VIEW_MODE:
        case actionNames.VIEW_UPDATE_FILTER_BY_NAME:
        case actionNames.VIEW_SET_STRICT_MATCH_FILTER: {
            const {tree, view} = state;

            calcBrowsersShowness(tree, view);
            calcSuitesShowness(tree);

            break;
        }

        case actionNames.VIEW_EXPAND_ALL: {
            changeAllNodesState(state.tree, {shouldBeOpened: true});

            break;
        }

        case actionNames.VIEW_COLLAPSE_ALL: {
            changeAllNodesState(state.tree, {shouldBeOpened: false});

            break;
        }

        case actionNames.VIEW_EXPAND_ERRORS:
        case actionNames.VIEW_EXPAND_RETRIES: {
            const {tree, view} = state;

            calcSuitesOpenness(tree, view.expand);
            calcBrowsersOpenness(tree, view.expand);
            calcImagesOpenness(tree, view.expand);

            break;
        }

        case actionNames.CLOSE_SECTIONS: {
            const closeImageIds = action.payload;

            closeImageIds.forEach((imageId) => {
                changeImageState(state.tree, imageId, {shouldBeOpened: false});
            });

            break;
        }

        case actionNames.TOGGLE_TESTS_GROUP: {
            const {browserIds, resultIds, isActive} = action.payload;
            const {tree, view} = state;

            if (!isActive) {
                changeAllBrowsersState(tree, {shouldBeShown: false, lastMatchedRetryIndex: null});
                changeAllSuitesState(tree, {shouldBeShown: false});
                changeAllResultsState(tree, {matchedSelectedGroup: false});

                return;
            }

            calcBrowsersShowness(tree, view, browserIds);

            tree.browsers.allIds.forEach((browserId) => {
                const {shouldBeShown} = tree.browsers.stateById[browserId];

                if (!shouldBeShown) {
                    return;
                }

                if (!browserIds.includes(browserId)) {
                    return changeBrowserState(tree, browserId, {shouldBeShown: false});
                }

                const broResultIds = tree.browsers.byId[browserId].resultIds;
                let lastMatchedRetryIndex = broResultIds.length - 1;

                broResultIds.forEach((resultId, ind) => {
                    if (!resultIds.includes(resultId)) {
                        changeResultState(tree, resultId, {matchedSelectedGroup: false});
                        return;
                    }

                    lastMatchedRetryIndex = ind;
                    changeResultState(tree, resultId, {matchedSelectedGroup: true});
                });

                changeBrowserState(tree, browserId, {lastMatchedRetryIndex});
            });

            calcSuitesShowness(tree);

            break;
        }

        case actionNames.GROUP_TESTS_BY_KEY: {
            const {tree, view} = state;

            changeAllResultsState(tree, {matchedSelectedGroup: false});

            if (view.keyToGroupTestsBy) {
                changeAllBrowsersState(tree, {shouldBeShown: false, lastMatchedRetryIndex: null});
                changeAllSuitesState(tree, {shouldBeShown: false});

                return;
            }

            calcBrowsersShowness(tree, view);
            calcSuitesShowness(tree);
            changeAllBrowsersState(tree, {lastMatchedRetryIndex: null});

            break;
        }

        case actionNames.UNDO_ACCEPT_IMAGES: {
            const {tree, view} = state;
            const {updatedImages = [], removedResults = [], skipTreeUpdate} = action.payload;

            if (skipTreeUpdate) {
                return;
            }

            const failedRemovedResults = removedResults.filter(resultId => {
                const result = tree.results.byId[resultId];
                const browser = tree.browsers.byId[result.parentId];
                const lastResultId = findLast(browser.resultIds, id => id !== resultId);
                const lastResult = tree.results.byId[lastResultId];

                return !isSuccessStatus(lastResult.status);
            });
            const failedResultIds = updatedImages.map(({parentId: resultId}) => resultId).concat(failedRemovedResults);
            const suiteIdsToFail = failedResultIds.map(resultId => {
                const result = tree.results.byId[resultId];
                const browser = tree.browsers.byId[result.parentId];
                const suite = tree.suites.byId[browser.parentId];

                return suite.id;
            });

            for (const updatedImage of updatedImages) {
                tree.images.byId[updatedImage.id] = updatedImage;
                tree.images.stateById[updatedImage.id].shouldBeOpened = true;

                tree.results.byId[updatedImage.parentId].status = FAIL;
            }

            for (const removedResultId of removedResults) {
                removeResult(tree, removedResultId);
            }

            failSuites(tree, suiteIdsToFail);

            calcBrowsersShowness(tree, view);
            calcSuitesShowness(tree);

            break;
        }

        case actionNames.TOGGLE_BROWSER_CHECKBOX: {
            const {suiteBrowserId, checkStatus} = action.payload;
            const parentId = getBrowserParentId(state.tree, suiteBrowserId);

            changeBrowserState(state.tree, suiteBrowserId, {checkStatus});

            updateParentsChecked(state.tree, parentId);

            break;
        }

        case actionNames.TOGGLE_SUITE_CHECKBOX: {
            const {suiteId, checkStatus} = action.payload;
            const parentId = state.tree.suites.byId[suiteId].parentId;
            const toggledSuiteIds = [suiteId];

            changeSuiteState(state.tree, suiteId, {checkStatus});

            while (toggledSuiteIds.length) {
                const suiteCurrId = toggledSuiteIds.pop();
                const suiteChildIds = state.tree.suites.byId[suiteCurrId].suiteIds || [];
                const suiteBrowserIds = state.tree.suites.byId[suiteCurrId].browserIds || [];

                suiteChildIds.forEach(suiteChildId => {
                    const isSuiteShown = state.tree.suites.stateById[suiteChildId].shouldBeShown;
                    const newCheckStatus = Number(isSuiteShown && checkStatus);
                    changeSuiteState(state.tree, suiteChildId, {checkStatus: newCheckStatus});
                });
                suiteBrowserIds.forEach(suiteBrowserId => {
                    const isBrowserShown = state.tree.browsers.stateById[suiteBrowserId].shouldBeShown;
                    const newCheckStatus = Number(isBrowserShown && checkStatus);
                    changeBrowserState(state.tree, suiteBrowserId, {checkStatus: newCheckStatus});
                });

                toggledSuiteIds.push(...suiteChildIds);
            }

            updateParentsChecked(state.tree, parentId);

            break;
        }

        case actionNames.TOGGLE_GROUP_CHECKBOX: {
            const {browserIds, checkStatus} = action.payload;
            const parentIds = browserIds.map(browserId => getBrowserParentId(state.tree, browserId));

            browserIds.forEach(browserId => {
                changeBrowserState(state.tree, browserId, {checkStatus});
            });

            updateParentsChecked(state.tree, parentIds);

            break;
        }
    }
});

function initNodesStates(state) {
    const {tree, view} = state;

    initBrowsersState(tree, view);
    initSuitesState(tree, view);
    initImagesState(tree, view.expand);
    initResultsState(tree);
}

function addNodesToTree(state, payload) {
    const {tree, view} = state;

    [].concat(payload).forEach(({result, images, suites}) => {
        addResult(tree, result);
        setBrowsersLastRetry(tree, result.parentId);
        addImages(tree, images, view.expand);
        updateSuitesStatus(tree, suites);

        const browserId = result.parentId;
        const youngestSuiteId = tree.browsers.byId[browserId].parentId;
        const suiteIds = view.expand === EXPAND_RETRIES ? youngestSuiteId : suites.map(({id}) => id);
        const imageIds = images.map(({id}) => id);

        calcSuitesOpenness(tree, view.expand, suiteIds);
        calcBrowsersOpenness(tree, view.expand, browserId);
        calcImagesOpenness(tree, view.expand, imageIds);

        if (view.viewMode === viewModes.FAILED) {
            calcBrowsersShowness(tree, view, browserId);
            calcSuitesShowness(tree, youngestSuiteId);
        }
    });

    tree.suites.failedRootIds = getFailedRootSuiteIds(tree.suites);
}

function changeAllNodesState(tree, state) {
    changeAllSuitesState(tree, state);
    changeAllBrowsersState(tree, state);
    changeAllImagesState(tree, state);
}
