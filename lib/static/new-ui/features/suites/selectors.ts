import {BrowserEntity, ImageEntity, ResultEntity, State} from '@/static/new-ui/types/store';
import {BrowserFeature, TimeTravelFeature} from '@/constants';
import {AttachmentType} from '@/types';

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

export const isTimeTravelPlayerAvailable = (state: State): boolean => {
    const currentResult = getCurrentResult(state);
    if (!currentResult) {
        return false;
    }

    const isRunning = state.running;
    const browserFeatures = state.browserFeatures;
    const isSnapshotAvailable = currentResult.attachments?.some(attachment => attachment.type === AttachmentType.Snapshot);
    const isTimeTravelAvailable = state.app.availableFeatures.some(f => f.name === TimeTravelFeature.name);
    const isLiveStreamingAvailable = isTimeTravelAvailable && browserFeatures[currentResult.name]?.some(feature => feature === BrowserFeature.LiveSnapshotsStreaming);

    return isSnapshotAvailable || (isRunning && isLiveStreamingAvailable);
};

export const getAttempt = (state: State): number | null => {
    const browserId = state.app.suitesPage.currentBrowserId;

    if (browserId) {
        return state.tree.browsers.stateById[browserId].retryIndex;
    }

    return null;
};
