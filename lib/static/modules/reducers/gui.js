import actionNames from '../action-names';
import {applyStateUpdate} from '@/static/modules/utils/state';
import {RunTestsFeature} from '@/constants';

export default (state, action) => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT: {
            return applyStateUpdate(state, {gui: true, app: {availableFeatures: [RunTestsFeature]}});
        }

        case actionNames.INIT_STATIC_REPORT: {
            return {...state, gui: false};
        }

        default:
            return state;
    }
};
