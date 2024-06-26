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
): ThunkAction<Promise<void>, Store, void, StaticAccepterCommitScreenshotAction> => {
    return async (dispatch: Dispatch) => {
        dispatch({type: actionNames.PROCESS_BEGIN});
        dispatch(staticAccepterCloseConfirm());

        try {
            const payload = new FormData();

            payload.append('repositoryUrl', repositoryUrl);
            payload.append('pullRequestUrl', pullRequestUrl);
            payload.append('message', message);

            if (!isEmpty(meta)) {
                payload.append('meta', JSON.stringify(meta));
            }

            await Promise.all(imagesInfo.map(async imageInfo => {
                const blob = await getBlob(imageInfo.image);

                payload.append('image', blob, imageInfo.path);
            }));

            const response = await axios.post(serviceUrl, payload, axiosRequestOptions);

            const commitedImageIds = imagesInfo.map(imageInfo => imageInfo.id);
            const commitedImages = imagesInfo.map(imageInfo => ({
                imageId: imageInfo.id,
                stateNameImageId: imageInfo.stateNameImageId
            }));

            if (response.status >= 200 && response.status < 400) {
                dispatch({type: actionNames.STATIC_ACCEPTER_COMMIT_SCREENSHOT, payload: commitedImageIds});

                storeCommitInLocalStorage(commitedImages);

                dispatch(createNotification('commitScreenshot', 'success', 'Screenshots were successfully committed'));
            } else {
                const errorMessage = [
                    `Unexpected statuscode from the service: ${response.status}.`,
                    `Server response: '${response.data}'`
                ].join('\n');

                throw new Error(errorMessage);
            }
        } catch (e) {
            console.error('Error while comitting screenshot:', e);
            dispatch(createNotificationError('commitScreenshot', e));
        } finally {
            dispatch({type: actionNames.PROCESS_END});
        }
    };
};
