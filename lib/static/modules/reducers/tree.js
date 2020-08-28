import {produce} from 'immer';
import actionNames from '../action-names';
import {isSuiteFailed} from '../utils';

export default produce((state, action) => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT: {
            const {tree} = action.payload;

            state.tree = tree;
            state.tree.suites.failedRootIds = getFailedRootSuiteIds(tree.suites);

            state.tree.browsers.stateById = {};
            state.tree.images.stateById = {};

            break;
        }

        case actionNames.RUN_ALL_TESTS: {
            const {status} = action.payload;

            state.tree.suites.allIds.forEach((suiteId) => {
                state.tree.suites.byId[suiteId].status = status;
            });

            break;
        }

        case actionNames.SUITE_BEGIN: {
            const {suiteId, status} = action.payload;

            state.tree.suites.byId[suiteId].status = status;

            break;
        }

        case actionNames.TEST_BEGIN:
        case actionNames.TEST_RESULT:
        case actionNames.ACCEPT_OPENED_SCREENSHOTS:
        case actionNames.ACCEPT_SCREENSHOT: {
            [].concat(action.payload).forEach(({result, images, suites}) => {
                state.tree.results.byId[result.id] = result;
                if (!state.tree.results.allIds.includes(result.id)) {
                    state.tree.results.allIds.push(result.id);
                }

                images.forEach((image) => {
                    state.tree.images.byId[image.id] = image;
                    if (!state.tree.images.allIds.includes(image.id)) {
                        state.tree.images.allIds.push(image.id);
                    }
                });

                if (!state.tree.browsers.byId[result.parentId].resultIds.includes(result.id)) {
                    state.tree.browsers.byId[result.parentId].resultIds.push(result.id);
                }

                suites.forEach(({id, status}) => {
                    state.tree.suites.byId[id].status = status;
                });

                state.tree.suites.failedRootIds = getFailedRootSuiteIds(state.tree.suites);
            });

            break;
        }

        case actionNames.CHANGE_TEST_RETRY: {
            const {browserId, retryIndex} = action.payload;

            if (!state.tree.browsers.stateById[browserId]) {
                state.tree.browsers.stateById[browserId] = {retryIndex};
            } else {
                state.tree.browsers.stateById[browserId].retryIndex = retryIndex;
            }

            break;
        }

        case actionNames.TOGGLE_STATE_RESULT: {
            const {imageId, opened} = action.payload;

            if (!state.tree.images.stateById[imageId]) {
                state.tree.images.stateById[imageId] = {opened};
            } else {
                state.tree.images.stateById[imageId].opened = opened;
            }

            break;
        }
    }
});

function getFailedRootSuiteIds(suites) {
    return suites.allRootIds.filter((rootId) => {
        return isSuiteFailed(suites.byId[rootId]);
    });
}
