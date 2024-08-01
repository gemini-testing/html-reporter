import actionNames from '../action-names';
import {Action} from './types';

type SuitesPageUpdateListPayload = {list: any};
export const suitesPageUpdateList = (payload: SuitesPageUpdateListPayload): Action<typeof actionNames.SUITES_PAGE_UPDATE_LIST, any> => {
    return {type: actionNames.SUITES_PAGE_UPDATE_LIST, payload} as const;
};

export const suitesPageSelectTest = (id: string): Action<typeof actionNames.SUITES_PAGE_SELECT_TEST, string> => {
    return {type: actionNames.SUITES_PAGE_SELECT_TEST, payload: id} as const;
};
