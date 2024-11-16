import {get, set, last, groupBy} from 'lodash';
import actionNames from '../action-names';
import {checkIsEnabled, getLocalStorageCommitedImageIds} from '../static-image-accepter';
import {applyStateUpdate, isAcceptable, isNodeSuccessful} from '../utils';
import {COMMITED, EditScreensFeature, STAGED} from '../../../constants';

export default (state, action) => {
    switch (action.type) {
        case actionNames.INIT_STATIC_REPORT: {
            if (!checkIsEnabled(state.config.staticImageAccepter, state.gui)) {
                return state;
            }

            return applyStateUpdate(state, {app: {availableFeatures: [EditScreensFeature]}, staticImageAccepter: initStaticImageAccepter(action.payload.tree)});
        }

        case actionNames.STATIC_ACCEPTER_DELAY_SCREENSHOT: {
            const currentAccepterDelayedImages = state.staticImageAccepter.accepterDelayedImages;
            const accepterDelayedImages = currentAccepterDelayedImages.concat(action.payload);

            return {...state, staticImageAccepter: {...state.staticImageAccepter, accepterDelayedImages}};
        }

        case actionNames.STATIC_ACCEPTER_UNDO_DELAY_SCREENSHOT: {
            const currentAccepterDelayedImages = state.staticImageAccepter.accepterDelayedImages;
            const accepterDelayedImages = currentAccepterDelayedImages.slice(0, -1);

            return {...state, staticImageAccepter: {...state.staticImageAccepter, accepterDelayedImages}};
        }

        case actionNames.STATIC_ACCEPTER_STAGE_SCREENSHOT: {
            const imageIdsToStage = action.payload;
            const acceptableImages = state.staticImageAccepter.acceptableImages;
            const acceptableImagesDiff = {};
            const diff = set({}, ['staticImageAccepter', 'acceptableImages'], acceptableImagesDiff);

            let imagesToCommitCountDiff = 0;

            for (const imageId of imageIdsToStage) {
                const stateImageIds = getStateImageIds(state.tree, imageId);
                const stagedImageId = stateImageIds.find(imageId => acceptableImages[imageId]?.commitStatus === STAGED);

                set(acceptableImagesDiff, [imageId, 'commitStatus'], STAGED);

                if (stagedImageId) {
                    set(acceptableImagesDiff, [stagedImageId, 'commitStatus'], null);
                } else {
                    imagesToCommitCountDiff++;
                }
            }

            const imagesToCommitCount = get(state, ['staticImageAccepter', 'imagesToCommitCount']);

            set(diff, ['staticImageAccepter', 'accepterDelayedImages'], []);
            set(diff, ['staticImageAccepter', 'imagesToCommitCount'], imagesToCommitCount + imagesToCommitCountDiff);

            return applyStateUpdate(state, diff);
        }

        case actionNames.STATIC_ACCEPTER_UNSTAGE_SCREENSHOT: {
            const acceptableImagesDiff = {};
            const diff = set({}, ['staticImageAccepter', 'acceptableImages'], acceptableImagesDiff);
            const imagesToCommitCount = get(state, ['staticImageAccepter', 'imagesToCommitCount']);

            set(diff, ['staticImageAccepter', 'imagesToCommitCount'], imagesToCommitCount - action.payload.length);
            for (const imageId of action.payload) {
                set(acceptableImagesDiff, [imageId, 'commitStatus'], null);
            }

            return applyStateUpdate(state, diff);
        }

        case actionNames.STATIC_ACCEPTER_COMMIT_SCREENSHOT: {
            const acceptableImages = state.staticImageAccepter.acceptableImages;

            const acceptableImagesDiff = {};
            const diff = set({}, ['staticImageAccepter', 'acceptableImages'], acceptableImagesDiff);

            for (const imageId of action.payload) {
                const stateImageIds = getStateImageIds(state.tree, imageId);
                const commitedImageId = stateImageIds.find(imageId => acceptableImages[imageId]?.commitStatus === COMMITED);

                if (commitedImageId) {
                    set(acceptableImagesDiff, [commitedImageId, 'commitStatus'], null);
                }

                set(acceptableImagesDiff, [imageId, 'commitStatus'], COMMITED);
            }

            set(diff, ['staticImageAccepter', 'accepterDelayedImages'], []);
            set(diff, ['staticImageAccepter', 'imagesToCommitCount'], 0);

            return applyStateUpdate(state, diff);
        }

        case actionNames.STATIC_ACCEPTER_UPDATE_TOOLBAR_OFFSET: {
            return applyStateUpdate(state, {
                ui: {
                    staticImageAccepterToolbar: {
                        offset: action.payload.offset
                    }
                }
            });
        }

        case actionNames.STATIC_ACCEPTER_UPDATE_COMMIT_MESSAGE: {
            return applyStateUpdate(state, {
                app: {
                    staticImageAccepterModal: {
                        commitMessage: action.payload.commitMessage
                    }
                }
            });
        }

        default:
            return state;
    }
};

const getStateNameImageId = (tree, imageId) => {
    const image = tree.images.byId[imageId];
    const result = tree.results.byId[image.parentId];
    const browser = tree.browsers.byId[result.parentId];

    return browser.id + ' ' + image.stateName;
};

function initStaticImageAccepter(tree) {
    const acceptableImageIds = tree.images.allIds.filter(imageId => isAcceptable(tree.images.byId[imageId])).sort();
    const stateNameImageIdGrouppedImageIds = groupBy(acceptableImageIds, imageId => getStateNameImageId(tree, imageId));

    const acceptableImages = Object.keys(stateNameImageIdGrouppedImageIds).reduce((acc, stateNameImageId) => {
        const lastStateNameImageId = last(stateNameImageIdGrouppedImageIds[stateNameImageId]);
        const lastStateNameImage = tree.images.byId[lastStateNameImageId];

        if (isNodeSuccessful(lastStateNameImage)) {
            return acc;
        }

        for (const imageId of stateNameImageIdGrouppedImageIds[stateNameImageId]) {
            const image = tree.images.byId[imageId];

            acc[imageId] = {
                id: image.id,
                parentId: image.parentId,
                stateName: image.stateName,
                commitStatus: null,
                originalStatus: image.status,
                stateNameImageId
            };
        }

        return acc;
    }, {});

    const commitedImageIds = getLocalStorageCommitedImageIds();

    for (const commitedImageId of commitedImageIds) {
        acceptableImages[commitedImageId].commitStatus = COMMITED;
    }

    return {
        enabled: true,
        acceptableImages,
        accepterDelayedImages: [], // used in screenshot-accepter
        imagesToCommitCount: 0 // showed on the "commit N images" button
    };
}

function getStateImageIds(tree, imageId) {
    const stateName = tree.images.byId[imageId].stateName;
    const resultId = tree.images.byId[imageId].parentId;
    const browserId = tree.results.byId[resultId].parentId;
    const resultIds = tree.browsers.byId[browserId].resultIds;

    const stateImageIds = [];

    for (const resultId of resultIds) {
        for (const currentImageId of tree.results.byId[resultId].imageIds) {
            if (tree.images.byId[currentImageId].stateName === stateName) {
                stateImageIds.push(currentImageId);
            }
        }
    }

    return stateImageIds;
}
