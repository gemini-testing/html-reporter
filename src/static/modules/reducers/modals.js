import actionNames from '../action-names';

export default (state = {}, action) => {
    switch (action.type) {
        case actionNames.OPEN_MODAL: {
            return {...state, modals: state.modals.concat(action.payload)};
        }

        case actionNames.CLOSE_MODAL: {
            return {...state, modals: state.modals.filter(({id}) => id !== action.payload.id)};
        }

        default:
            return state;
    }
};
