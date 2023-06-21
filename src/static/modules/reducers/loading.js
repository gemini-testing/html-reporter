import actionNames from '../action-names';

export default (state = {}, action) => {
    switch (action.type) {
        case actionNames.TOGGLE_LOADING: {
            return {...state, loading: action.payload};
        }

        default:
            return state;
    }
};
