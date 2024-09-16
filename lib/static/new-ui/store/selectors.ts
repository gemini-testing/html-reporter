import {
    State,
    BrowserEntity,
    ImageEntity,
    ResultEntity,
    SuiteEntity,
    SuiteState,
    BrowserState
} from '@/static/new-ui/types/store';

export const getAllRootSuiteIds = (state: State): string[] => state.tree.suites.allRootIds;
export const getSuites = (state: State): Record<string, SuiteEntity> => state.tree.suites.byId;
export const getSuitesState = (state: State): Record<string, SuiteState> => state.tree.suites.stateById;
export const getBrowsers = (state: State): Record<string, BrowserEntity> => state.tree.browsers.byId;
export const getBrowsersState = (state: State): Record<string, BrowserState> => state.tree.browsers.stateById;
export const getAllBrowserIds = (state: State): string[] => state.tree.browsers.allIds;
export const getResults = (state: State): Record<string, ResultEntity> => state.tree.results.byId;
export const getImages = (state: State): Record<string, ImageEntity> => state.tree.images.byId;
export const getCurrentResultId = (state: State): string | null => {
    const browserId = state.app.currentSuiteId;
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
