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
    if (!browserId) {
        return null;
    }

    const resultIds = state.tree.browsers.byId[browserId].resultIds;

    return resultIds[state.tree.browsers.stateById[browserId].retryIndex];
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
