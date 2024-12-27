import axios from 'axios';

import actionNames from '@/static/modules/action-names';
import {Action, AppThunk} from '@/static/modules/actions/types';
import {processBegin, processEnd} from '@/static/modules/actions/processing';
import {TestBranch, TestRefUpdateData} from '@/tests-tree-builder/gui';
import {UndoAcceptImagesResult} from '@/gui/tool-runner';
import {createNotificationError} from '@/static/modules/actions/notifications';

export type CommitAcceptedImagesToTreeAction = Action<typeof actionNames.COMMIT_ACCEPTED_IMAGES_TO_TREE, TestBranch[]>;
export const commitAcceptedImagesToTree = (payload: CommitAcceptedImagesToTreeAction['payload']): CommitAcceptedImagesToTreeAction => ({type: actionNames.COMMIT_ACCEPTED_IMAGES_TO_TREE, payload});

interface AcceptImagesData {
    imageIds: string[];
    shouldCommitUpdatesToTree?: boolean;
}

export const thunkAcceptImages = ({imageIds, shouldCommitUpdatesToTree = true}: AcceptImagesData): AppThunk<Promise<TestBranch[] | null>> => {
    return async (dispatch) => {
        dispatch(processBegin());

        try {
            const {data} = await axios.post<TestRefUpdateData[]>('/reference-data-to-update', imageIds);
            const {data: testBranches} = await axios.post<TestBranch[]>('/update-reference', data);
            if (shouldCommitUpdatesToTree) {
                dispatch(commitAcceptedImagesToTree(testBranches));
            }

            dispatch(processEnd());

            return testBranches;
        } catch (e: unknown) {
            console.error('Error while updating references of failed tests:', e);
            dispatch(createNotificationError('acceptScreenshot', e as Error));

            dispatch(processEnd());

            return null;
        }
    };
};

export type CommitRevertedImagesToTreeAction = Action<typeof actionNames.COMMIT_REVERTED_IMAGES_TO_TREE, UndoAcceptImagesResult>;
export const commitRevertedImagesToTree = (payload: CommitRevertedImagesToTreeAction['payload']): CommitRevertedImagesToTreeAction => ({type: actionNames.COMMIT_REVERTED_IMAGES_TO_TREE, payload});

interface RevertImagesData {
    imageIds: string[];
    shouldCommitUpdatesToTree?: boolean;
}

export const thunkRevertImages = ({imageIds, shouldCommitUpdatesToTree = true}: RevertImagesData): AppThunk => {
    return async (dispatch) => {
        dispatch(processBegin());

        try {
            const {data} = await axios.post<TestRefUpdateData[]>('/reference-data-to-update', imageIds);
            const {data: updatedData} = await axios.post<UndoAcceptImagesResult>('/undo-accept-images', data);
            if (shouldCommitUpdatesToTree) {
                dispatch(commitRevertedImagesToTree(updatedData));
            }

            dispatch(processEnd());
        } catch (e: unknown) {
            console.error('Error while reverting reference:', e);
            dispatch(createNotificationError('undoScreenshot', e as Error));

            dispatch(processEnd());
        }
    };
};

export type ScreenshotsAction =
    | CommitAcceptedImagesToTreeAction
    | CommitRevertedImagesToTreeAction;
