import actionNames from '../action-names';

export default (state = {}, action) => {
    switch (action.type) {
        case actionNames.STOP_TESTS: {
            return {...state, stopping: true};
        }

        case actionNames.TESTS_END: {
            return {...state, stopping: false};
        }

        default:
            return state;
    }
};
