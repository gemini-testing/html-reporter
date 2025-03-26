import {State} from '@/static/new-ui/types/store';
import {SomeAction} from '@/static/modules/actions/types';
import actionNames from '@/static/modules/action-names';
import {applyStateUpdate} from '@/static/modules/utils';
import {Feature, ShowTimeTravelExperimentFeature, TimeTravelFeature, ToolName} from '@/constants';
import * as localStorageWrapper from '../local-storage-wrapper';
import {getTimeTravelFeatureLocalStorageKey} from '@/constants/local-storage';

export default (state: State, action: SomeAction): State => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT: {
            const features: Feature[] = [...state.app.availableFeatures];

            const toolName = action.payload.apiValues?.toolName;
            if (toolName === ToolName.Testplane) {
                features.push(ShowTimeTravelExperimentFeature);

                const isTimeTravelAvailable = localStorageWrapper.getItem(getTimeTravelFeatureLocalStorageKey(toolName ?? ''), false);
                if (isTimeTravelAvailable) {
                    features.push(TimeTravelFeature);
                }
            }

            if (features.length > 0) {
                return applyStateUpdate(state, {app: {availableFeatures: features}});
            }

            return state;
        }
        case actionNames.SET_AVAILABLE_FEATURES: {
            const toolName = state.apiValues.toolName;
            localStorageWrapper.setItem(getTimeTravelFeatureLocalStorageKey(toolName), action.payload.features.some(f => f.name === TimeTravelFeature.name));

            return applyStateUpdate(state, {app: {availableFeatures: action.payload.features}});
        }
    }

    return state;
};
