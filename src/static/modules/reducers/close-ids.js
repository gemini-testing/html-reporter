import actionNames from '../action-names';

export default (state, action) => {
    switch (action.type) {
        case actionNames.CLOSE_SECTIONS: {
            return {...state, closeIds: action.payload};
        }

        default:
            return state;
    }
};
