import {closeDatabase} from '../../../db-utils/client';
import actionNames from '../action-names';

export default (state, action) => {
    switch (action.type) {
        case actionNames.INIT_STATIC_REPORT:
        case actionNames.INIT_GUI_REPORT: {
            const {db} = action.payload;

            return {...state, db};
        }

        case actionNames.TESTS_END: {
            closeDatabase(state.db); // close previous connection in order to free memory
            const {db} = action.payload;

            return {...state, db};
        }

        case actionNames.FIN_STATIC_REPORT:
        case actionNames.FIN_GUI_REPORT: {
            closeDatabase(state.db);

            return state;
        }

        default:
            return state;
    }
};
