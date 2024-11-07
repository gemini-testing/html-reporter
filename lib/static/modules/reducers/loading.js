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

        case actionNames.UPDATE_LOADING_IS_IN_PROGRESS: {
            return applyStateUpdate(state, {
                app: {
                    loading: {isInProgress: action.payload}
                }
            });
        }

        case actionNames.UPDATE_LOADING_VISIBILITY: {
            return applyStateUpdate(state, {
                app: {
                    loading: {isVisible: action.payload}
                }
            });
        }

        case actionNames.UPDATE_LOADING_TITLE: {
            return applyStateUpdate(state, {
                app: {
                    loading: {taskTitle: action.payload}
                }
            });
        }

        default:
            return state;
    }
};
