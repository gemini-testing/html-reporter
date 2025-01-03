import actionNames from '@/static/modules/action-names';
import {Action} from '@/static/modules/actions/types';

export type ProcessBeginAction = Action<typeof actionNames.PROCESS_BEGIN>;
export const processBegin = (): ProcessBeginAction => ({type: actionNames.PROCESS_BEGIN});

export type ProcessEndAction = Action<typeof actionNames.PROCESS_END>;
export const processEnd = (): ProcessEndAction => ({type: actionNames.PROCESS_END});

export type ProcessingAction =
    | ProcessBeginAction
    | ProcessEndAction;
