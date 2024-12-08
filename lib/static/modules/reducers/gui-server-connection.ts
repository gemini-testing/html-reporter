import {State} from '@/static/new-ui/types/store';
import {SomeAction} from '@/static/modules/actions/types';
import actionNames from '@/static/modules/action-names';
import {applyStateUpdate} from '@/static/modules/utils';

export default (state: State, action: SomeAction): State => {
    switch (action.type) {
        case actionNames.SET_GUI_SERVER_CONNECTION_STATUS: {
            return applyStateUpdate(state, {
                app: {
                    guiServerConnection: {
                        isConnected: action.payload.isConnected
                    }
                }
            });
        }
        default:
            return state;
    }
};
