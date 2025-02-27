import type {Action} from '@/static/modules/actions/types';
import actionNames from '@/static/modules/action-names';
import {Feature} from '@/constants';

export type SetAvailableFeaturesAction = Action<typeof actionNames.SET_AVAILABLE_FEATURES, {
    features: Feature[];
}>;
export const setAvailableFeatures = (payload: SetAvailableFeaturesAction['payload']): SetAvailableFeaturesAction => ({
    type: actionNames.SET_AVAILABLE_FEATURES,
    payload
});

export type FeaturesAction =
    | SetAvailableFeaturesAction;
