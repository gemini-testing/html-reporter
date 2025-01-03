import axios from 'axios';
import actionNames from '@/static/modules/action-names';
import {type Action, AppThunk} from '@/static/modules/actions/types';
import {createNotificationError} from '@/static/modules/actions/notifications';
import {CustomGuiActionPayload} from '@/adapters/tool/types';

export type RunCustomGuiAction = Action<typeof actionNames.RUN_CUSTOM_GUI_ACTION, CustomGuiActionPayload>;
export const runCustomGui = (payload: RunCustomGuiAction['payload']): RunCustomGuiAction => ({type: actionNames.RUN_CUSTOM_GUI_ACTION, payload});

export const thunkRunCustomGuiAction = (payload: CustomGuiActionPayload): AppThunk => {
    return async (dispatch) => {
        try {
            const {sectionName, groupIndex, controlIndex} = payload;

            await axios.post('/run-custom-gui-action', {sectionName, groupIndex, controlIndex});

            dispatch(runCustomGui(payload));
        } catch (e: unknown) {
            dispatch(createNotificationError('runCustomGuiAction', e as Error));
        }
    };
};

export type CustomGuiAction =
    | RunCustomGuiAction;
