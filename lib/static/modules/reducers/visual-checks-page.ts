import {State} from '@/static/new-ui/types/store';
import actionNames from '@/static/modules/action-names';
import {applyStateUpdate} from '@/static/modules/utils/state';
import {VisualChecksPageAction} from '@/static/modules/actions';
import * as localStorageWrapper from '../local-storage-wrapper';
import {TWO_UP_DIFF_VISIBILITY_KEY, TWO_UP_FIT_MODE_KEY} from '@/constants/local-storage';

export default (state: State, action: VisualChecksPageAction): State => {
    switch (action.type) {
        case actionNames.VISUAL_CHECKS_PAGE_SET_CURRENT_NAMED_IMAGE:
            return applyStateUpdate(state, {app: {visualChecksPage: action.payload}}) as State;
        case actionNames.VISUAL_CHECKS_TOGGLE_2UP_DIFF_VISIBILITY:
            localStorageWrapper.setItem(TWO_UP_DIFF_VISIBILITY_KEY, action.payload.isVisible);
            return applyStateUpdate(state, {
                ui: {
                    visualChecksPage: {
                        is2UpDiffVisible: action.payload.isVisible
                    }
                }
            }) as State;
        case actionNames.VISUAL_CHECKS_SET_2UP_FIT_MODE:
            localStorageWrapper.setItem(TWO_UP_FIT_MODE_KEY, action.payload.fitMode);
            return applyStateUpdate(state, {
                ui: {
                    visualChecksPage: {
                        twoUpFitMode: action.payload.fitMode
                    }
                }
            }) as State;
        case actionNames.VISUAL_CHECKS_SET_DIFF_MODE:
            return applyStateUpdate(state, {
                app: {
                    visualChecksPage: {
                        diffMode: action.payload.diffModeId
                    }
                }
            }) as State;
        default:
            return state;
    }
};
