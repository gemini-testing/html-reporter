import actionNames from '../action-names';
import {initSearch} from '@/static/modules/search';

export default (state, action) => {
    switch (action.type) {
        case actionNames.SET_REPEAT_COUNT: {
            return {...state, repeatCount: action.payload.repeatCount};
        }
        case actionNames.SET_REPEAT_LEFT: {
            return {...state, repeatLeft: action.payload.repeatLeft};
        }
        case actionNames.TEST_BEGIN:
        case actionNames.RUN_ALL_TESTS:
        case actionNames.RUN_FAILED_TESTS:
        case actionNames.RETRY_SUITE:
        case actionNames.RETRY_TEST: {
            return {...state, running: true};
        }

        case actionNames.TESTS_END: {
            initSearch(state.tree);

            return {...state, running: false};
        }

        default:
            return state;
    }
};
