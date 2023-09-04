import actionNames from '../action-names';
import {applyStateUpdate} from '../utils/state';

export default ((state, action) => {
    switch (action.type) {
        case actionNames.UPDATE_BOTTOM_PROGRESS_BAR: {
            const {currentRootSuiteId} = action.payload;
            return applyStateUpdate(state, {progressBar: {currentRootSuiteId}});
        }

        default:
            return state;
    }
});
