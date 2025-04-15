import {findLast, isEmpty, get} from 'lodash';
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
    initImagesState, changeAllImagesState, changeImageState, addImages, calcImagesOpenness, changeImageStatus
} from './nodes/images';
import {ViewMode} from '../../../../constants/view-modes';
import {EXPAND_RETRIES} from '../../../../constants/expand-modes';
import {COMMITED, FAIL, STAGED, TestStatus} from '../../../../constants/test-statuses';
import {isCommitedStatus, isStagedStatus, isSuccessStatus} from '../../../../common-utils';
import {applyStateUpdate, ensureDiffProperty, getUpdatedProperty} from '../../utils/state';
import {changeNodeState, getStaticAccepterStateNameImages, resolveUpdatedStatuses, updateImagesStatus} from './helpers';
import * as staticImageAccepter from '../../static-image-accepter';
import {CHECKED, UNCHECKED} from '@/constants/checked-statuses';

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

            tree.groups = {
                byId: {},
                allRootIds: []
            };

            updateAllSuitesStatus(tree, filteredBrowsers);
            initNodesStates({tree, view: state.view});
            resolveUpdatedStatuses(tree.results.byId, tree.images.byId, tree.suites.byId);

            if (staticImageAccepter.checkIsEnabled(state.config?.staticImageAccepter, state.gui)) {
                const imageIdsArray = staticImageAccepter.getLocalStorageCommitedImageIds();

                updateImagesStatus({tree, view: state.view, imageIdsArray, newStatus: COMMITED});
            }

            return {...applyStateUpdate(state, {
                app: {
                    isNewUi: action.payload.isNewUi
                }
            }), tree};
        }

        case actionNames.RUN_ALL_TESTS: {
            const {tree} = state;

            ensureDiffProperty(diff, ['tree', 'suites', 'byId']);

            tree.suites.allIds.forEach((suiteId) => {
                diff.tree.suites.byId[suiteId] = {status: TestStatus.QUEUED};
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

            const treeNodeId = action.payload.suitesPage?.treeNodeId;
            if (treeNodeId) {
                diff.ui = {
                    suitesPage: {
                        retryIndexByTreeNodeId: {
                            [treeNodeId]: retryIndex
                        }
                    }
                };
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
        case actionNames.VIEW_SET_FILTER_MATCH_CASE:
        case actionNames.VIEW_SET_FILTER_USE_REGEX:
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

        case actionNames.SELECT_ALL: {
            changeAllNodesState(state.tree, {checkStatus: CHECKED}, diff.tree);

            return applyStateUpdate(state, diff);
        }

        case actionNames.DESELECT_ALL: {
            changeAllNodesState(state.tree, {checkStatus: UNCHECKED}, diff.tree);

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
                        changeResultState({tree, resultId, state: {matchedSelectedGroup: false}, diff: diff.tree});
                        return;
                    }

                    lastMatchedRetryIndex = ind;
                    changeResultState({tree, resultId, state: {matchedSelectedGroup: true}, diff: diff.tree});
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

        case actionNames.STATIC_ACCEPTER_STAGE_SCREENSHOT: {
            const {tree, view, staticImageAccepter} = state;
            const imageIdsToStage = action.payload;

            const stateNameImages = getStaticAccepterStateNameImages(imageIdsToStage, staticImageAccepter);
            const stagedImages = stateNameImages.filter(image => isStagedStatus(tree.images.byId[image.id].status));
            const stagedImageOriginalStatuses = stagedImages.map(image => ({
                id: image.id,
                status: staticImageAccepter.acceptableImages[image.id].originalStatus
            }));

            const images = imageIdsToStage.map(id => ({id, status: STAGED})).concat(stagedImageOriginalStatuses);

            updateImagesStatus({tree, view, images, diff: diff.tree});

            return applyStateUpdate(state, diff);
        }

        case actionNames.STATIC_ACCEPTER_UNSTAGE_SCREENSHOT: {
            const {tree, view} = state;
            const imageIdsToUnstage = action.payload;

            const failedBrowserIds = [];
            const failedSuiteIds = [];
            const imageIds = [];

            for (const imageId of imageIdsToUnstage) {
                const originalStatus = get(state, ['staticImageAccepter', 'acceptableImages', imageId, 'originalStatus']);

                const failedResultId = tree.images.byId[imageId].parentId;
                const failedBrowserId = tree.results.byId[failedResultId].parentId;
                const failedSuiteId = tree.browsers.byId[failedBrowserId].parentId;

                ensureDiffProperty(diff, ['tree', 'results', 'byId']);

                changeImageStatus(tree, imageId, originalStatus, diff.tree);
                changeNodeState(tree.results.byId, failedResultId, {status: FAIL}, diff.tree.results.byId);

                failedBrowserIds.push(failedBrowserId);
                failedSuiteIds.push(failedSuiteId);
                imageIds.push(imageId);
            }

            failSuites(tree, failedSuiteIds, diff.tree);

            calcSuitesOpenness({tree, expand: view.expand, suiteIds: failedSuiteIds, diff: diff.tree});
            calcBrowsersOpenness({tree, expand: view.expand, browserIds: failedBrowserIds, diff: diff.tree});
            calcImagesOpenness({tree, expand: view.expand, imageIds, diff: diff.tree});

            calcBrowsersShowness({tree, view, browserIds: failedBrowserIds, diff: diff.tree});
            calcSuitesShowness({tree, suiteIds: failedSuiteIds, diff: diff.tree});

            return applyStateUpdate(state, diff);
        }

        case actionNames.STATIC_ACCEPTER_COMMIT_SCREENSHOT: {
            const {tree, view, staticImageAccepter} = state;
            const imageIdsToCommit = action.payload;
            const stateNameImageIds = imageIdsToCommit.map(imageId => staticImageAccepter.acceptableImages[imageId].stateNameImageId);
            const relevantImages = Object.values(staticImageAccepter.acceptableImages).filter(image => stateNameImageIds.includes(image.stateNameImageId));
            const commitedImages = relevantImages.filter(image => isCommitedStatus(tree.images.byId[image.id].status));
            const commitedImageOriginalStatuses = commitedImages.map(image => ({
                id: image.id,
                status: staticImageAccepter.acceptableImages[image.id].originalStatus
            }));

            const images = imageIdsToCommit.map(id => ({id, status: COMMITED})).concat(commitedImageOriginalStatuses);

            updateImagesStatus({tree, view, images, diff: diff.tree});

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
            case actionNames.COMMIT_ACCEPTED_IMAGES_TO_TREE: {
                addNodesToTree(draft, action.payload);

                break;
            }

            case actionNames.COMMIT_REVERTED_IMAGES_TO_TREE: {
                const {tree, view} = draft;
                const {updatedImages = [], removedResults = []} = action.payload;

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
        resolveUpdatedStatuses([result], tree.images.byId, suites);

        addResult(tree, result);
        setBrowsersLastRetry(tree, result.parentId);
        addImages(tree, images, view.expand);
        updateSuitesStatus(tree, suites);

        const browserId = result.parentId;
        const youngestSuiteId = tree.browsers.byId[browserId].parentId;
        const suiteIds = view.expand === EXPAND_RETRIES ? [youngestSuiteId] : suites.map(({id}) => id);
        const imageIds = images.map(({id}) => id);

        calcSuitesOpenness({tree, expand: view.expand, suiteIds});
        calcBrowsersOpenness({tree, expand: view.expand, browserIds: [browserId]});
        calcImagesOpenness({tree, expand: view.expand, imageIds});

        if (view.viewMode === ViewMode.FAILED) {
            calcBrowsersShowness({tree, view, browserIds: [browserId]});
            calcSuitesShowness({tree, suiteIds: [youngestSuiteId]});
        }
    });

    tree.suites.failedRootIds = getFailedRootSuiteIds(tree.suites);
}

function changeAllNodesState(tree, state, diff = tree) {
    changeAllSuitesState(tree, state, diff);
    changeAllBrowsersState(tree, state, diff);
    changeAllImagesState(tree, state, diff);
}
