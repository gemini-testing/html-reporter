import {State} from '@/static/new-ui/types/store';
import {SomeAction} from '@/static/modules/actions/types';
import actionNames from '@/static/modules/action-names';
import {applyStateUpdate} from '@/static/modules/utils';
import {Feature} from '@/constants';

export default (state: State, action: SomeAction): State => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT: {
            const features: Feature[] = [...state.app.availableFeatures];

            const featuresFromServer = (action.payload as {features: Feature[]})?.features ?? [];
            features.push(...featuresFromServer);

            if (features.length > 0) {
                return applyStateUpdate(state, {app: {availableFeatures: features}});
            }

            return state;
        }
        case actionNames.SET_AVAILABLE_FEATURES: {
            return applyStateUpdate(state, {app: {availableFeatures: action.payload.features}});
        }
    }

    return state;
};
