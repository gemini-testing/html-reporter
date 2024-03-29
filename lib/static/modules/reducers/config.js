import {cloneDeep} from 'lodash';
import {CONTROL_TYPE_RADIOBUTTON} from '../../../gui/constants/custom-gui-control-types';
import actionNames from '../action-names';
import {applyStateUpdate} from '../utils/state';

export default (state, action) => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT: {
            const {config} = action.payload;

            config.errorPatterns = formatErrorPatterns(config.errorPatterns);

            return applyStateUpdate(state, {config});
        }

        case actionNames.RUN_CUSTOM_GUI_ACTION: {
            const {sectionName, groupIndex, controlIndex} = action.payload;

            const customGui = cloneDeep(state.config.customGui);
            const {type, controls} = customGui[sectionName][groupIndex];

            if (type === CONTROL_TYPE_RADIOBUTTON) {
                controls.forEach((control, i) => control.active = (controlIndex === i));

                return applyStateUpdate(state, {config: {customGui}});
            }

            return state;
        }

        default:
            return state;
    }
};

function formatErrorPatterns(errorPatterns) {
    return errorPatterns.map((patternInfo) => ({...patternInfo, regexp: new RegExp(patternInfo.pattern)}));
}
