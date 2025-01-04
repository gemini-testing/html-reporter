import type {Action} from '@/static/modules/actions/types';
import actionNames from '@/static/modules/action-names';

export type OpenModalAction = Action<typeof actionNames.OPEN_MODAL, {
    id: string;
    type: string;
    data?: unknown;
}>;
export const openModal = (payload: OpenModalAction['payload']): OpenModalAction => ({type: actionNames.OPEN_MODAL, payload});

export type CloseModalAction = Action<typeof actionNames.CLOSE_MODAL, {
    id: string;
}>;
export const closeModal = (payload: CloseModalAction['payload']): CloseModalAction => ({type: actionNames.CLOSE_MODAL, payload});

export type ModalsAction =
    | OpenModalAction
    | CloseModalAction;
