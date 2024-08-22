import actionNames from '../action-names';
import {SuitesPageSetCurrentSuiteAction} from '@/static/modules/reducers/suites-page';

export const suitesPageSetCurrentSuite = (suiteId: string): SuitesPageSetCurrentSuiteAction => {
    return {type: actionNames.SUITES_PAGE_SET_CURRENT_SUITE, payload: {suiteId}};
};
