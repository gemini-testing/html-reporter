import axios from 'axios';
import {isEmpty} from 'lodash';
import {types as modalTypes} from '../../components/modals';
import {openModal, closeModal, createNotificationError, createNotification} from './index';
import {getBlob} from '../utils';
import {storeCommitInLocalStorage} from '../static-image-accepter';
import actionNames from '../action-names';
import defaultState from '../default-state';
import type {Action, Dispatch, Store} from './types';
import {ThunkAction} from 'redux-thunk';
import {Point} from '@/static/new-ui/types';

type StaticAccepterDelayScreenshotPayload = {imageId: string, stateName: string, stateNameImageId: string}[];
type StaticAccepterDelayScreenshotAction = Action<typeof actionNames.STATIC_ACCEPTER_DELAY_SCREENSHOT, StaticAccepterDelayScreenshotPayload>
export const staticAccepterDelayScreenshot = (images: StaticAccepterDelayScreenshotPayload): StaticAccepterDelayScreenshotAction => {
    return {type: actionNames.STATIC_ACCEPTER_DELAY_SCREENSHOT, payload: images} as const;
};

type StaticAccepterUndoDelayScreenshotAction = Action<typeof actionNames.STATIC_ACCEPTER_UNDO_DELAY_SCREENSHOT>;
export const staticAccepterUndoDelayScreenshot = (): StaticAccepterUndoDelayScreenshotAction => {
    return {type: actionNames.STATIC_ACCEPTER_UNDO_DELAY_SCREENSHOT};
};

type StaticAccepterStageScreenshotAction = Action<typeof actionNames.STATIC_ACCEPTER_STAGE_SCREENSHOT, string[]>;
export const staticAccepterStageScreenshot = (imageIds: string[]): StaticAccepterStageScreenshotAction => {
    return {type: actionNames.STATIC_ACCEPTER_STAGE_SCREENSHOT, payload: imageIds};
};

type StaticAccepterUnstageScreenshotAction = Action<typeof actionNames.STATIC_ACCEPTER_UNSTAGE_SCREENSHOT, {imageId: string}>;
export const staticAccepterUnstageScreenshot = (imageId: string): StaticAccepterUnstageScreenshotAction => {
    return {type: actionNames.STATIC_ACCEPTER_UNSTAGE_SCREENSHOT, payload: {imageId}};
};

type StaticAccepterOpenConfirmAction = Action<typeof actionNames.OPEN_MODAL, {
    id: typeof modalTypes.STATIC_ACCEPTER_CONFIRM,
    type: typeof modalTypes.STATIC_ACCEPTER_CONFIRM
}>;

export const staticAccepterOpenConfirm = (): StaticAccepterOpenConfirmAction => openModal({
    id: modalTypes.STATIC_ACCEPTER_CONFIRM,
    type: modalTypes.STATIC_ACCEPTER_CONFIRM
});

type StaticAccepterCloseConfirmAction = Action<typeof actionNames.CLOSE_MODAL>;
export const staticAccepterCloseConfirm = (): StaticAccepterCloseConfirmAction => closeModal({id: modalTypes.STATIC_ACCEPTER_CONFIRM});

type StaticAccepterConfig = typeof defaultState['config']['staticImageAccepter'];
type StaticAccepterPayload = {id: string, stateNameImageId: string, image: string, path: string}[];
type StaticAccepterCommitScreenshotOptions = Pick<StaticAccepterConfig, 'repositoryUrl' | 'pullRequestUrl' | 'serviceUrl' | 'axiosRequestOptions' | 'meta'> & {message: string};

export interface CommitResult {
    error?: Error;
}

type StaticAccepterCommitScreenshotAction = Action<typeof actionNames.STATIC_ACCEPTER_COMMIT_SCREENSHOT, string[]>;
export const staticAccepterCommitScreenshot = (
    imagesInfo: StaticAccepterPayload,
    {
        repositoryUrl,
        pullRequestUrl,
        serviceUrl,
        message,
        axiosRequestOptions = {},
        meta
    }: StaticAccepterCommitScreenshotOptions
): ThunkAction<Promise<CommitResult>, Store, void, StaticAccepterCommitScreenshotAction> => {
    return async (dispatch: Dispatch): Promise<CommitResult> => {
        dispatch({type: actionNames.PROCESS_BEGIN});
        dispatch(staticAccepterCloseConfirm());
        dispatch({type: actionNames.UPDATE_LOADING_IS_IN_PROGRESS, payload: true});
        dispatch({type: actionNames.UPDATE_LOADING_TITLE, payload: `Preparing images to commit: 0 of ${imagesInfo.length}`});
        dispatch({type: actionNames.UPDATE_LOADING_VISIBILITY, payload: true});

        try {
            const payload = new FormData();

            payload.append('repositoryUrl', repositoryUrl);
            payload.append('pullRequestUrl', pullRequestUrl);
            payload.append('message', message);

            if (!isEmpty(meta)) {
                payload.append('meta', JSON.stringify(meta));
            }

            await Promise.all(imagesInfo.map(async (imageInfo, index) => {
                dispatch({type: actionNames.UPDATE_LOADING_TITLE, payload: `Preparing images to commit: ${index + 1} of ${imagesInfo.length}`});

                const blob = await getBlob(imageInfo.image);

                payload.append('image', blob, imageInfo.path);
            }));

            dispatch({type: actionNames.UPDATE_LOADING_TITLE, payload: 'Uploading images'});
            const response = await axios.post(serviceUrl, payload, {
                ...axiosRequestOptions,
                onUploadProgress: (e) => {
                    dispatch({type: actionNames.UPDATE_LOADING_PROGRESS, payload: {'static-accepter-commit': e.loaded / (e.total ?? e.loaded)}});
                }
            });

            const commitedImageIds = imagesInfo.map(imageInfo => imageInfo.id);
            const commitedImages = imagesInfo.map(imageInfo => ({
                imageId: imageInfo.id,
                stateNameImageId: imageInfo.stateNameImageId
            }));

            if (response.status >= 200 && response.status < 400) {
                dispatch({type: actionNames.STATIC_ACCEPTER_COMMIT_SCREENSHOT, payload: commitedImageIds});

                storeCommitInLocalStorage(commitedImages);

                dispatch({type: actionNames.UPDATE_LOADING_IS_IN_PROGRESS, payload: false});
                dispatch({type: actionNames.UPDATE_LOADING_TITLE, payload: 'All images committed!'});
                dispatch(createNotification('commitScreenshot', 'success', 'Screenshots were successfully committed'));
            } else {
                const errorMessage = [
                    `Unexpected status code from the service: ${response.status}.`,
                    `Server response: '${response.data}'`
                ].join('\n');

                throw new Error(errorMessage);
            }
        } catch (e) {
            console.error('An error occurred while commiting screenshot:', e);
            dispatch(createNotificationError('commitScreenshot', e));

            return {error: e as Error};
        } finally {
            dispatch({type: actionNames.UPDATE_LOADING_VISIBILITY, payload: false});
            dispatch({type: actionNames.PROCESS_END});
        }

        return {};
    };
};

type StaticAccepterUpdateToolbarPositionAction = Action<typeof actionNames.STATIC_ACCEPTER_UPDATE_TOOLBAR_OFFSET, {offset: Point}>;
export const staticAccepterUpdateToolbarOffset = (payload: {offset: Point}): StaticAccepterUpdateToolbarPositionAction => {
    return {type: actionNames.STATIC_ACCEPTER_UPDATE_TOOLBAR_OFFSET, payload};
};

type StaticAccepterUpdateCommitMessageAction = Action<typeof actionNames.STATIC_ACCEPTER_UPDATE_COMMIT_MESSAGE, {commitMessage: string}>;
export const staticAccepterUpdateCommitMessage = (payload: {commitMessage: string}): StaticAccepterUpdateCommitMessageAction => {
    return {type: actionNames.STATIC_ACCEPTER_UPDATE_COMMIT_MESSAGE, payload};
};
