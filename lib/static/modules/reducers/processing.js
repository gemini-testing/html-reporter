import actionNames from '../action-names';

export default (state = {}, action) => {
    switch (action.type) {
        case actionNames.RUN_ALL_TESTS:
        case actionNames.RUN_FAILED_TESTS:
        case actionNames.RETRY_SUITE:
        case actionNames.RETRY_TEST:
        case actionNames.PROCESS_BEGIN: {
            return {...state, processing: true};
        }

        case actionNames.TESTS_END:
        case actionNames.PROCESS_END:
        case actionNames.STOP_SERVER: {
            return {...state, processing: false};
        }

        default:
            return state;
    }
};
