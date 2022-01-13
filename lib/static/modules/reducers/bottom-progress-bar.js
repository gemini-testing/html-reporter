import actionNames from '../action-names';
import {produce} from 'immer';
import {set} from 'lodash';

export default produce((draft, action) => {
    switch (action.type) {
        case actionNames.UPDATE_BOTTOM_PROGRESS_BAR: {
            const {currentRootSuiteId} = action.payload;

            return set(draft, 'progressBar.currentRootSuiteId', currentRootSuiteId);
        }

        default:
            return draft;
    }
});
