import {BrowserEntity, ImageEntity, ResultEntity, State} from '@/static/new-ui/types/store';

export const getCurrentBrowser = (state: State): BrowserEntity | null => {
    const browserId = state.app.suitesPage.currentBrowserId;
    if (!browserId) {
        return null;
    }

    return state.tree.browsers.byId[browserId];
};

export const getCurrentResultId = (state: State): string | null => {
    const browserId = state.app.suitesPage.currentBrowserId;
    const treeNodeId = state.app.suitesPage.currentTreeNodeId;
    if (!browserId || !treeNodeId) {
        return null;
    }

    const resultIds = state.tree.browsers.byId[browserId].resultIds;

    const groupId = state.app.suitesPage.currentGroupId;

    const treeNodeRetryResultId = resultIds[state.ui.suitesPage.retryIndexByTreeNodeId[treeNodeId] ?? -1];

    let lastMatchedGroupResultId: string | undefined;
    if (groupId) {
        const group = state.tree.groups.byId[groupId];
        lastMatchedGroupResultId = resultIds.findLast(resultId => group.resultIds.includes(resultId));
    }

    const browserIdRetryResultId = resultIds[state.tree.browsers.stateById[browserId].retryIndex];

    return treeNodeRetryResultId ?? lastMatchedGroupResultId ?? browserIdRetryResultId;
};

export const getCurrentResult = (state: State): ResultEntity | null => {
    const resultId = getCurrentResultId(state);

    if (!resultId) {
        return null;
    }

    return state.tree.results.byId[resultId];
};

export const getExpandedStepsById = (state: State): Record<string, boolean> => {
    const resultId = getCurrentResultId(state);

    return resultId ? state.ui.suitesPage.expandedStepsByResultId[resultId] ?? {} : {};
};

export const getCurrentResultImages = (state: State): ImageEntity[] => {
    const result = getCurrentResult(state);

    return result?.imageIds.map(imageId => state.tree.images.byId[imageId]) ?? [];
};
