import actionNames from '@/static/modules/action-names';
import type {Action} from '@/static/modules/actions/types';

export type ToggleLoadingAction = Action<typeof actionNames.TOGGLE_LOADING, {
    active: boolean;
    content?: string;
}>;
export const toggleLoading = (payload: ToggleLoadingAction['payload']): ToggleLoadingAction => ({type: actionNames.TOGGLE_LOADING, payload});

export type LoadingAction =
    | ToggleLoadingAction;
