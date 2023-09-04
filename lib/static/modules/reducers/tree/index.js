import {findLast, isEmpty} from 'lodash';
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
import {ViewMode} from '../../../../constants/view-modes';
import {EXPAND_RETRIES} from '../../../../constants/expand-modes';
import {FAIL} from '../../../../constants/test-statuses';
import {isSuccessStatus} from '../../../../common-utils';
import {applyStateUpdate, ensureDiffProperty, getUpdatedProperty} from '../../utils';

export default ((state, action) => {
    const diff = {tree: {}};

    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT: {
            const {tree} = action.payload;
            const {filteredBrowsers} = state.view;

            tree.suites.failedRootIds = getFailedRootSuiteIds(tree.suites);

            tree.suites.stateById = {};
            tree.browsers.stateById = {};
            tree.results.stateById = {};
            tree.images.stateById = {};

            updateAllSuitesStatus(tree, filteredBrowsers);
            initNodesStates({tree, view: state.view});

            return {...state, tree};
        }

        case actionNames.RUN_ALL_TESTS: {
            const {status} = action.payload;
            const {tree} = state;

            ensureDiffProperty(diff, ['tree', 'suites', 'byId']);

            tree.suites.allIds.forEach((suiteId) => {
                diff.tree.suites.byId[suiteId] = {status};
            });

            return applyStateUpdate(state, diff);
        }

        case actionNames.TOGGLE_SUITE_SECTION: {
            const {suiteId, shouldBeOpened} = action.payload;

            changeSuiteState(state.tree, suiteId, {shouldBeOpened}, diff.tree);

            return applyStateUpdate(state, diff);
        }

        case actionNames.TOGGLE_BROWSER_SECTION: {
            const {browserId, shouldBeOpened} = action.payload;

            changeBrowserState(state.tree, browserId, {shouldBeOpened}, diff.tree);

            return applyStateUpdate(state, diff);
        }

        case actionNames.TOGGLE_STATE_RESULT: {
            const {imageId, shouldBeOpened} = action.payload;

            changeImageState(state.tree, imageId, {shouldBeOpened}, diff.tree);

            return applyStateUpdate(state, diff);
        }

        case actionNames.CHANGE_TEST_RETRY: {
            const {browserId, retryIndex} = action.payload;
            const browserState = {retryIndex};

            if (state.view.keyToGroupTestsBy) {
                browserState.lastMatchedRetryIndex = null;
            }

            changeBrowserState(state.tree, browserId, browserState, diff.tree);

            return applyStateUpdate(state, diff);
        }

        case actionNames.BROWSERS_SELECTED: {
            const {tree, view} = state;
            const filteredBrowsers = isEmpty(view.filteredBrowsers)
                ? state.browsers.map(({id}) => ({id, versions: []}))
                : view.filteredBrowsers;

            updateAllSuitesStatus(tree, filteredBrowsers, diff.tree);
            calcBrowsersShowness({tree, view, diff: diff.tree});
            calcSuitesShowness({tree, diff: diff.tree});

            return applyStateUpdate(state, diff);
        }

        case actionNames.CHANGE_VIEW_MODE:
        case actionNames.VIEW_UPDATE_FILTER_BY_NAME:
        case actionNames.VIEW_SET_STRICT_MATCH_FILTER: {
            const {tree, view} = state;

            calcBrowsersShowness({tree, view, diff: diff.tree});
            calcSuitesShowness({tree, diff: diff.tree});

            return applyStateUpdate(state, diff);
        }

        case actionNames.VIEW_EXPAND_ALL: {
            changeAllNodesState(state.tree, {shouldBeOpened: true}, diff.tree);

            return applyStateUpdate(state, diff);
        }

        case actionNames.VIEW_COLLAPSE_ALL: {
            changeAllNodesState(state.tree, {shouldBeOpened: false}, diff.tree);

            return applyStateUpdate(state, diff);
        }

        case actionNames.VIEW_EXPAND_ERRORS:
        case actionNames.VIEW_EXPAND_RETRIES: {
            const {tree, view} = state;

            calcSuitesOpenness({tree, expand: view.expand, diff: diff.tree});
            calcBrowsersOpenness({tree, expand: view.expand, diff: diff.tree});
            calcImagesOpenness({tree, expand: view.expand, diff: diff.tree});

            return applyStateUpdate(state, diff);
        }

        case actionNames.CLOSE_SECTIONS: {
            const closeImageIds = action.payload;

            closeImageIds.forEach((imageId) => {
                changeImageState(state.tree, imageId, {shouldBeOpened: false}, diff.tree);
            });

            return applyStateUpdate(state, diff);
        }

        case actionNames.TOGGLE_TESTS_GROUP: {
            const {browserIds, resultIds, isActive} = action.payload;
            const {tree, view} = state;

            if (!isActive) {
                changeAllBrowsersState(tree, {shouldBeShown: false, lastMatchedRetryIndex: null}, diff.tree);
                changeAllSuitesState(tree, {shouldBeShown: false}, diff.tree);
                changeAllResultsState(tree, {matchedSelectedGroup: false}, diff.tree);

                return applyStateUpdate(state, diff);
            }

            calcBrowsersShowness({tree, view, browserIds, diff: diff.tree});

            tree.browsers.allIds.forEach((browserId) => {
                const shouldBeShown = getUpdatedProperty(tree, diff.tree, ['browsers', 'stateById', browserId, 'shouldBeShown']);

                if (!shouldBeShown) {
                    return;
                }

                if (!browserIds.includes(browserId)) {
                    return changeBrowserState(tree, browserId, {shouldBeShown: false}, diff.tree);
                }

                const broResultIds = tree.browsers.byId[browserId].resultIds;
                let lastMatchedRetryIndex = broResultIds.length - 1;

                broResultIds.forEach((resultId, ind) => {
                    if (!resultIds.includes(resultId)) {
                        changeResultState(tree, resultId, {matchedSelectedGroup: false}, diff.tree);
                        return;
                    }

                    lastMatchedRetryIndex = ind;
                    changeResultState(tree, resultId, {matchedSelectedGroup: true}, diff.tree);
                });

                changeBrowserState(tree, browserId, {lastMatchedRetryIndex}, diff.tree);
            });

            calcSuitesShowness({tree, diff: diff.tree});

            return applyStateUpdate(state, diff);
        }

        case actionNames.GROUP_TESTS_BY_KEY: {
            const {tree, view} = state;

            changeAllResultsState(tree, {matchedSelectedGroup: false}, diff.tree);

            if (view.keyToGroupTestsBy) {
                changeAllBrowsersState(tree, {shouldBeShown: false, lastMatchedRetryIndex: null}, diff.tree);
                changeAllSuitesState(tree, {shouldBeShown: false}, diff.tree);

                return applyStateUpdate(state, diff);
            }

            calcBrowsersShowness({tree, view, diff: diff.tree});
            calcSuitesShowness({tree, diff: diff.tree});
            changeAllBrowsersState(tree, {lastMatchedRetryIndex: null}, diff.tree);

            return applyStateUpdate(state, diff);
        }
    }

    return produce(state, (draft) => {
        switch (action.type) {
            case actionNames.TEST_BEGIN: {
                [].concat(action.payload).forEach(({result, suites}) => {
                    addResult(draft.tree, result);
                    setBrowsersLastRetry(draft.tree, result.parentId);
                    updateSuitesStatus(draft.tree, suites);
                });

                break;
            }

            case actionNames.TEST_RESULT:
            case actionNames.ACCEPT_OPENED_SCREENSHOTS:
            case actionNames.ACCEPT_SCREENSHOT:
            case actionNames.APPLY_DELAYED_TEST_RESULTS: {
                addNodesToTree(draft, action.payload);

                break;
            }

            case actionNames.UNDO_ACCEPT_IMAGES: {
                const {tree, view} = draft;
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

                calcBrowsersShowness({tree, view});
                calcSuitesShowness({tree});

                break;
            }

            case actionNames.TOGGLE_BROWSER_CHECKBOX: {
                const {suiteBrowserId, checkStatus} = action.payload;
                const parentId = getBrowserParentId(draft.tree, suiteBrowserId);

                changeBrowserState(draft.tree, suiteBrowserId, {checkStatus});

                updateParentsChecked(draft.tree, parentId);

                break;
            }

            case actionNames.TOGGLE_SUITE_CHECKBOX: {
                const {suiteId, checkStatus} = action.payload;
                const parentId = draft.tree.suites.byId[suiteId].parentId;
                const toggledSuiteIds = [suiteId];

                changeSuiteState(draft.tree, suiteId, {checkStatus});

                while (toggledSuiteIds.length) {
                    const suiteCurrId = toggledSuiteIds.pop();
                    const suiteChildIds = draft.tree.suites.byId[suiteCurrId].suiteIds || [];
                    const suiteBrowserIds = draft.tree.suites.byId[suiteCurrId].browserIds || [];

                    suiteChildIds.forEach(suiteChildId => {
                        const isSuiteShown = draft.tree.suites.stateById[suiteChildId].shouldBeShown;
                        const newCheckStatus = Number(isSuiteShown && checkStatus);
                        changeSuiteState(draft.tree, suiteChildId, {checkStatus: newCheckStatus});
                    });
                    suiteBrowserIds.forEach(suiteBrowserId => {
                        const isBrowserShown = draft.tree.browsers.stateById[suiteBrowserId].shouldBeShown;
                        const newCheckStatus = Number(isBrowserShown && checkStatus);
                        changeBrowserState(draft.tree, suiteBrowserId, {checkStatus: newCheckStatus});
                    });

                    toggledSuiteIds.push(...suiteChildIds);
                }

                updateParentsChecked(draft.tree, parentId);

                break;
            }

            case actionNames.TOGGLE_GROUP_CHECKBOX: {
                const {browserIds, checkStatus} = action.payload;
                const parentIds = browserIds.map(browserId => getBrowserParentId(draft.tree, browserId));

                browserIds.forEach(browserId => {
                    changeBrowserState(draft.tree, browserId, {checkStatus});
                });

                updateParentsChecked(draft.tree, parentIds);

                break;
            }
        }
    });
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

        calcSuitesOpenness({tree, expand: view.expand, suiteIds});
        calcBrowsersOpenness({tree, expand: view.expand, browserId});
        calcImagesOpenness({tree, expand: view.expand, imageIds});

        if (view.viewMode === ViewMode.FAILED) {
            calcBrowsersShowness({tree, view, browserIds: [browserId]});
            calcSuitesShowness({tree, suiteIds: youngestSuiteId});
        }
    });

    tree.suites.failedRootIds = getFailedRootSuiteIds(tree.suites);
}

function changeAllNodesState(tree, state, diff = tree) {
    changeAllSuitesState(tree, state, diff);
    changeAllBrowsersState(tree, state, diff);
    changeAllImagesState(tree, state, diff);
}
