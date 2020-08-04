import {closeDatabase} from '../database-utils';
import actionNames from '../action-names';

export default (state, action) => {
    switch (action.type) {
        case actionNames.INIT_STATIC_REPORT: {
            const {db} = action.payload;
            return {...state, db};
        }

        case actionNames.FIN_STATIC_REPORT: {
            closeDatabase(state.db);

            return state;
        }

        default:
            return state;
    }
};
