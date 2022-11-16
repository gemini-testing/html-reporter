import actionNames from '../action-names';

export default (state = {}, action) => {
    switch (action.type) {
        case actionNames.STOP_SERVER: {
            return {...state, serverStopped: true};
        }

        default:
            return state;
    }
};
