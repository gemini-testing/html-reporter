import {Action} from '@/static/modules/actions/types';
import actionNames from '@/static/modules/action-names';

type SetGuiServerConnectionStatusAction = Action<typeof actionNames.SET_GUI_SERVER_CONNECTION_STATUS, {
    isConnected: boolean;
    wasDisconnected?: boolean;
}>;
export const setGuiServerConnectionStatus = (payload: SetGuiServerConnectionStatusAction['payload']): SetGuiServerConnectionStatusAction =>
    ({type: actionNames.SET_GUI_SERVER_CONNECTION_STATUS, payload});

export type GuiServerConnectionAction = SetGuiServerConnectionStatusAction;
