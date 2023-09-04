import actionNames from '../action-names';
import {applyStateUpdate} from '../utils';

export default (state, action) => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT: {
            const {apiValues} = action.payload;

            return applyStateUpdate(state, {apiValues});
        }

        default:
            return state;
    }
};
