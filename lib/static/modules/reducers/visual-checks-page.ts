import {State} from '@/static/new-ui/types/store';
import actionNames from '@/static/modules/action-names';
import {applyStateUpdate} from '@/static/modules/utils/state';
import {VisualChecksPageAction} from '@/static/modules/actions';

export default (state: State, action: VisualChecksPageAction): State => {
    switch (action.type) {
        case actionNames.VISUAL_CHECKS_PAGE_SET_CURRENT_NAMED_IMAGE:
            return applyStateUpdate(state, {app: {visualChecksPage: {currentNamedImageId: action.payload.namedImageId}}}) as State;
        default:
            return state;
    }
};
