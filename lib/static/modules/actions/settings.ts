import {DiffModeId} from '@/constants';
import {Action} from '@/static/modules/actions/types';
import actionNames from '@/static/modules/action-names';

type UpdateBaseHostAction = Action<typeof actionNames.VIEW_UPDATE_BASE_HOST, {
    host: string;
}>;
export const updateBaseHost = (host: string): UpdateBaseHostAction => ({type: actionNames.VIEW_UPDATE_BASE_HOST, payload: {host}});

type SetDiffModeAction = Action<typeof actionNames.SET_DIFF_MODE, {
    diffModeId: DiffModeId;
}>;
export const setDiffMode = (payload: SetDiffModeAction['payload']): SetDiffModeAction => ({type: actionNames.SET_DIFF_MODE, payload});

export type SettingsAction =
    | UpdateBaseHostAction
    | SetDiffModeAction;
