import actionNames from '../action-names';

export default (state = {}, action) => {
    switch (action.type) {
        case actionNames.RUN_ALL_TESTS:
        case actionNames.RUN_FAILED_TESTS:
        case actionNames.RETRY_SUITE:
        case actionNames.RETRY_TEST: {
            return {...state, running: true};
        }

        case actionNames.TESTS_END:
        case actionNames.STOP_SERVER: {
            return {...state, running: false};
        }

        default:
            return state;
    }
};
