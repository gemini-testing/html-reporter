import {reducer} from 'reapop';

export default (state, action) => {
    if (!action.type.startsWith('reapop/')) {
        return state;
    }

    return {
        ...state,
        notifications: reducer()([], action)
    };
};
