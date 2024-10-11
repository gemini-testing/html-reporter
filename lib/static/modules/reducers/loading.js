import actionNames from '../action-names';
import {applyStateUpdate} from '@/static/modules/utils/state';

export default (state, action) => {
    switch (action.type) {
        case actionNames.TOGGLE_LOADING: {
            return {...state, loading: action.payload};
        }

        case actionNames.UPDATE_LOADING_PROGRESS: {
            return applyStateUpdate(state, {
                app: {
                    loading: {progress: action.payload}
                }
            });
        }

        default:
            return state;
    }
};
