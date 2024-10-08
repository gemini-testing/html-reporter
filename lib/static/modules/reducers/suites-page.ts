import {State} from '@/static/new-ui/types/store';
import {SuitesPageAction} from '@/static/modules/actions/suites-page';
import actionNames from '@/static/modules/action-names';
import {applyStateUpdate} from '@/static/modules/utils/state';

export default (state: State, action: SuitesPageAction): State => {
    switch (action.type) {
        case actionNames.SUITES_PAGE_SET_CURRENT_SUITE:
            return applyStateUpdate(state, {app: {suitesPage: {currentBrowserId: action.payload.suiteId}}}) as State;
        case actionNames.SUITES_PAGE_SET_SECTION_EXPANDED: {
            return applyStateUpdate(state, {
                ui: {
                    suitesPage: {
                        expandedSectionsById: {
                            [action.payload.sectionId]: action.payload.isExpanded
                        }
                    }
                }
            }) as State;
        }
        case actionNames.SUITES_PAGE_SET_STEPS_EXPANDED: {
            if (!action.payload.resultId) {
                return state;
            }

            return applyStateUpdate(state, {
                ui: {
                    suitesPage: {
                        expandedStepsByResultId: {
                            [action.payload.resultId]: action.payload.expandedById
                        }
                    }
                }
            }) as State;
        }
        default:
            return state;
    }
};
