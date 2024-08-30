import {State} from '@/static/new-ui/types/store';
import {SuitesPageAction} from '@/static/modules/actions/suites-page';
import actionNames from '@/static/modules/action-names';

export default (state: State, action: SuitesPageAction): State => {
    switch (action.type) {
        case actionNames.SUITES_PAGE_SET_CURRENT_SUITE:
            return {...state, app: {...state.app, currentSuiteId: action.payload.suiteId}};
        case actionNames.SUITES_PAGE_SET_SECTION_EXPANDED: {
            const newState = Object.assign({}, state);
            const newExpandedSectionsById = Object.assign({}, state.ui.suitesPage.expandedSectionsById, {
                [action.payload.sectionId]: action.payload.isExpanded
            });
            newState.ui = Object.assign({}, state.ui, {
                suitesPage: Object.assign({}, state.ui.suitesPage, {expandedSectionsById: newExpandedSectionsById})
            });

            return newState;
        }
        default:
            return state;
    }
};
