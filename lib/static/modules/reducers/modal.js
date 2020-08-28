import actionNames from '../action-names';

export default (state = {}, action) => {
    switch (action.type) {
        case actionNames.SHOW_MODAL: {
            return {...state, modal: action.payload};
        }

        case actionNames.HIDE_MODAL: {
            return {...state, modal: {}};
        }

        default:
            return state;
    }
};
