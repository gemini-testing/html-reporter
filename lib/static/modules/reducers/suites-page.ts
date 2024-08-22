import actionNames from '../action-names';
import {State} from '@/static/new-ui/types/store';
import {Action} from '@/static/modules/actions/types';

export type SuitesPageSetCurrentSuiteAction = Action<typeof actionNames.SUITES_PAGE_SET_CURRENT_SUITE, {
    suiteId: string;
}>;

export default (state: State, action: SuitesPageSetCurrentSuiteAction): State => {
    switch (action.type) {
        case actionNames.SUITES_PAGE_SET_CURRENT_SUITE:
            return {...state, app: {...state.app, currentSuiteId: action.payload.suiteId}};
        default:
            return state;
    }
};
