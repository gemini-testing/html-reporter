import axios from 'axios';
import {isEmpty} from 'lodash';
import PQueue from 'p-queue';
import {types as modalTypes} from '../../components/modals';
import {getBlobWithRetires} from '../utils';
import {storeCommitInLocalStorage} from '../static-image-accepter';
import actionNames from '../action-names';
import defaultState from '../default-state';
import type {Action, Dispatch, Store} from './types';
import {ThunkAction} from 'redux-thunk';
import {Point} from '@/static/new-ui/types';
import {closeModal, openModal} from '@/static/modules/actions/modals';
import {createNotification, createNotificationError} from '@/static/modules/actions/notifications';
import {startStaticAccepter} from '@/static/modules/static-accepter-v2';
import type {
    StaticAccepterProgress,
    StaticAccepterProgressPhase,
    StaticAccepterResult
} from '@/static/modules/static-accepter-v2';

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

type StaticAccepterUnstageScreenshotAction = Action<typeof actionNames.STATIC_ACCEPTER_UNSTAGE_SCREENSHOT, string[]>;
export const staticAccepterUnstageScreenshot = (imageIds: string[]): StaticAccepterUnstageScreenshotAction => {
    return {type: actionNames.STATIC_ACCEPTER_UNSTAGE_SCREENSHOT, payload: imageIds};
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
type StaticAccepterCommitScreenshotOptions = Pick<
    StaticAccepterConfig,
    'repositoryUrl' | 'pullRequestUrl' | 'serviceUrl' | 'moduleUrl' | 'axiosRequestOptions' | 'meta'
> & {message: string};

export interface CommitResult {
    error?: Error;
    status?: StaticAccepterResult['status'];
}

const STATIC_ACCEPTER_PROGRESS_TITLES: Record<StaticAccepterProgressPhase, string> = {
    downloading: 'Downloading screenshots',
    committing: 'Creating commits',
    'waiting-for-confirmation': 'Waiting for static accepter confirmation',
    submitting: 'Adding changes to PR',
    suggesting: 'Suggesting changes in Arcanum'
};

export const formatStaticAccepterProgress = ({phase, completed, total}: StaticAccepterProgress): string => {
    const roundedCompleted = Math.round(completed * 100) / 100;

    return `${STATIC_ACCEPTER_PROGRESS_TITLES[phase]}: ${roundedCompleted} of ${total}`;
};

const finishStaticAccepterV2 = (dispatch: Dispatch): void => {
    dispatch({type: actionNames.UPDATE_LOADING_IS_IN_PROGRESS, payload: false});
    dispatch({type: actionNames.UPDATE_LOADING_VISIBILITY, payload: false});
    dispatch({type: actionNames.PROCESS_END});
};

const handleStaticAccepterV2Error = (dispatch: Dispatch, error: unknown): CommitResult => {
    const normalizedError = error instanceof Error ? error : new Error(String(error));

    console.error('An error occurred while committing screenshots with Static Accepter v2:', normalizedError);

    dispatch(createNotificationError('commitScreenshot', normalizedError, {dismissAfter: 0, allowHTML: false}));

    return {error: normalizedError};
};

type StaticAccepterCommitScreenshotAction = Action<typeof actionNames.STATIC_ACCEPTER_COMMIT_SCREENSHOT, string[]>;
export const staticAccepterCommitScreenshot = (
    imagesInfo: StaticAccepterPayload,
    {
        repositoryUrl,
        pullRequestUrl,
        serviceUrl,
        moduleUrl,
        message,
        axiosRequestOptions = {},
        meta
    }: StaticAccepterCommitScreenshotOptions
): ThunkAction<Promise<CommitResult>, Store, void, StaticAccepterCommitScreenshotAction> => {
    return (dispatch: Dispatch): Promise<CommitResult> => {
        // #region static accepter v2 path
        if (moduleUrl) {
            let operation: Promise<StaticAccepterResult>;
            let pendingProgress: StaticAccepterProgress | null = null;
            let isProgressReady = false;

            const dispatchProgress = (progress: StaticAccepterProgress): void => {
                const ratio = progress.total > 0 ? progress.completed / progress.total : 0;

                dispatch({type: actionNames.UPDATE_LOADING_TITLE, payload: formatStaticAccepterProgress(progress)});
                dispatch({
                    type: actionNames.UPDATE_LOADING_PROGRESS,
                    payload: {'static-accepter-commit': Math.max(0, Math.min(1, ratio))}
                });
            };

            try {
                // This must stay in the synchronous dispatch stack of the trusted click.
                operation = startStaticAccepter(moduleUrl, imagesInfo, {
                    message,
                    theme: 'light',
                    config: {
                        repositoryUrl,
                        pullRequestUrl
                    },
                    onProgressChange: (progress) => {
                        if (!isProgressReady) {
                            pendingProgress = progress;
                            return;
                        }

                        dispatchProgress(progress);
                    }
                });
            } catch (error) {
                return Promise.resolve(handleStaticAccepterV2Error(dispatch, error));
            }

            // Only the invocation that acquired the adapter lock owns shared processing state.
            dispatch({type: actionNames.PROCESS_BEGIN});
            dispatch({type: actionNames.UPDATE_LOADING_IS_IN_PROGRESS, payload: true});
            dispatch({type: actionNames.UPDATE_LOADING_TITLE, payload: 'Starting Static Accepter'});
            dispatch({type: actionNames.UPDATE_LOADING_VISIBILITY, payload: true});
            dispatch({type: actionNames.UPDATE_LOADING_PROGRESS, payload: {'static-accepter-commit': 0}});
            isProgressReady = true;

            if (pendingProgress) {
                dispatchProgress(pendingProgress);
            }

            return operation
                .then((result): CommitResult => {
                    dispatch(staticAccepterCloseConfirm());

                    if (result.status === 'cancelled') {
                        return {status: result.status};
                    }

                    const committedImageIds = imagesInfo.map(imageInfo => imageInfo.id);
                    const committedImages = imagesInfo.map(imageInfo => ({
                        imageId: imageInfo.id,
                        stateNameImageId: imageInfo.stateNameImageId
                    }));
                    const isSubmitted = result.status === 'submitted';

                    dispatch({type: actionNames.STATIC_ACCEPTER_COMMIT_SCREENSHOT, payload: committedImageIds});
                    storeCommitInLocalStorage(committedImages);
                    dispatch({
                        type: actionNames.UPDATE_LOADING_TITLE,
                        payload: isSubmitted ? 'Screenshot changes were committed' : 'Screenshot changes were suggested'
                    });
                    dispatch(createNotification(
                        'commitScreenshot',
                        'success',
                        isSubmitted ? 'Screenshot changes were committed' : 'Screenshot changes were suggested',
                        {allowHTML: false}
                    ));

                    return {status: result.status};
                })
                .catch((error) => handleStaticAccepterV2Error(dispatch, error))
                .finally(() => finishStaticAccepterV2(dispatch));
        }
        // #endregion

        dispatch({type: actionNames.PROCESS_BEGIN});
        dispatch(staticAccepterCloseConfirm());
        dispatch({type: actionNames.UPDATE_LOADING_IS_IN_PROGRESS, payload: true});
        dispatch({type: actionNames.UPDATE_LOADING_TITLE, payload: `Preparing images to commit: 0 of ${imagesInfo.length}`});
        dispatch({type: actionNames.UPDATE_LOADING_VISIBILITY, payload: true});

        return (async (): Promise<CommitResult> => {
            try {
                if (!serviceUrl) {
                    throw new Error('Static Accepter serviceUrl is not configured');
                }

                const payload = new FormData();

                payload.append('repositoryUrl', repositoryUrl);
                payload.append('pullRequestUrl', pullRequestUrl);
                payload.append('message', message);

                if (!isEmpty(meta)) {
                    payload.append('meta', JSON.stringify(meta));
                }

                const queue = new PQueue({concurrency: 256});

                for (let i = 0; i < imagesInfo.length; i++) {
                    queue.add(async () => {
                        const blob = await getBlobWithRetires(imagesInfo[i].image);

                        payload.append('image', blob, imagesInfo[i].path);

                        dispatch({type: actionNames.UPDATE_LOADING_TITLE, payload: `Preparing images to commit: ${i + 1} of ${imagesInfo.length}`});
                    });
                }

                await queue.onIdle();

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
                dispatch(createNotificationError('commitScreenshot', e as Error));

                return {error: e as Error};
            } finally {
                dispatch({type: actionNames.UPDATE_LOADING_VISIBILITY, payload: false});
                dispatch({type: actionNames.PROCESS_END});
            }

            return {};
        })();
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

export type StaticAccepterAction =
    | StaticAccepterDelayScreenshotAction
    | StaticAccepterUndoDelayScreenshotAction
    | StaticAccepterStageScreenshotAction
    | StaticAccepterUnstageScreenshotAction
    | StaticAccepterCommitScreenshotAction
    | StaticAccepterUpdateToolbarPositionAction
    | StaticAccepterUpdateCommitMessageAction;
