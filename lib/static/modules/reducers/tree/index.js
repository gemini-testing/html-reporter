import {produce} from 'immer';
import actionNames from '../../action-names';
import {
    initSuitesState, changeAllSuitesState, changeSuiteState, updateSuitesStatus,
    getFailedRootSuiteIds, updateAllSuitesStatus, calcSuitesShowness, calcSuitesOpenness
} from './nodes/suites';
import {
    initBrowsersState, changeAllBrowsersState, changeBrowserState,
    calcBrowsersShowness, calcBrowsersOpenness, setBrowsersLastRetry
} from './nodes/browsers';
import {addResult} from './nodes/results';
import {
    initImagesState, changeAllImagesState, changeImageState, addImages, calcImagesOpenness
} from './nodes/images';
import viewModes from '../../../../constants/view-modes';
import {EXPAND_RETRIES} from '../../../../constants/expand-modes';

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
        case actionNames.ACCEPT_SCREENSHOT: {
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

            changeBrowserState(state.tree, browserId, {retryIndex});

            break;
        }

        case actionNames.BROWSERS_SELECTED: {
            const {tree, view} = state;

            updateAllSuitesStatus(tree, view.filteredBrowsers);
            calcBrowsersShowness(tree, view);
            calcSuitesShowness(tree);

            break;
        }

        case actionNames.VIEW_SHOW_ALL:
        case actionNames.VIEW_SHOW_FAILED:
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

            setBrowsersLastRetry(tree);

            break;
        }

        case actionNames.CLOSE_SECTIONS: {
            const closeImageIds = action.payload;

            closeImageIds.forEach((imageId) => {
                changeImageState(state.tree, imageId, {shouldBeOpened: false});
            });

            break;
        }

        case actionNames.TOGGLE_ERROR_GROUP: {
            const {browserIds, isActive} = action.payload;
            const {tree, view} = state;

            if (!isActive) {
                changeAllBrowsersState(tree, {shouldBeShown: false});
                changeAllSuitesState(tree, {shouldBeShown: false});

                return;
            }

            calcBrowsersShowness(tree, view, browserIds);

            tree.browsers.allIds.forEach((browserId) => {
                const {shouldBeShown} = tree.browsers.stateById[browserId];

                if (browserIds.includes(browserId) || !shouldBeShown) {
                    return;
                }

                changeBrowserState(tree, browserId, {shouldBeShown: false});
            });

            calcSuitesShowness(tree);

            break;
        }

        case actionNames.VIEW_TOGGLE_GROUP_BY_ERROR: {
            const {tree, view} = state;

            if (view.groupByError) {
                changeAllBrowsersState(tree, {shouldBeShown: false});
                changeAllSuitesState(tree, {shouldBeShown: false});

                return;
            }

            calcBrowsersShowness(tree, view);
            calcSuitesShowness(tree);

            break;
        }
    }
});

function initNodesStates(state) {
    const {tree, view} = state;

    initBrowsersState(tree, view);
    initSuitesState(tree, view);
    initImagesState(tree, view.expand);
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
