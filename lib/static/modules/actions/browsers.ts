import {Action} from '@/static/modules/actions/types';
import actionNames from '@/static/modules/action-names';
import {BrowserFeature} from '@/constants/browser';

type SetBrowserFeaturesAction = Action<typeof actionNames.SET_BROWSER_FEATURES, {
    browserFeatures: Record<string, BrowserFeature[]>;
}>;
export const setBrowserFeatures = (payload: SetBrowserFeaturesAction['payload']): SetBrowserFeaturesAction => ({
    type: actionNames.SET_BROWSER_FEATURES,
    payload
});

export type BrowsersAction = SetBrowserFeaturesAction;
