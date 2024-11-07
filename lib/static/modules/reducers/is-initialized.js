import actionNames from '../action-names';
import {applyStateUpdate} from '@/static/modules/utils';

export default (state, action) => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT:
            return applyStateUpdate(state, {app: {isInitialized: true, loading: {isVisible: false}}});

        default:
            return state;
    }
};
