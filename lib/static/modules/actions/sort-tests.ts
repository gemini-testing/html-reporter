import actionNames from '@/static/modules/action-names';
import {Action} from '@/static/modules/actions/types';
import {SortDirection} from '@/static/new-ui/types/store';

type SetCurrentSortByExpressionAction = Action<typeof actionNames.SORT_TESTS_SET_CURRENT_EXPRESSION, {
    expressionIds: string[];
}>;
export const setCurrentSortByExpression = (payload: SetCurrentSortByExpressionAction['payload']): SetCurrentSortByExpressionAction =>
    ({type: actionNames.SORT_TESTS_SET_CURRENT_EXPRESSION, payload});

type SetSortByDirectionAction = Action<typeof actionNames.SORT_TESTS_SET_DIRECTION, {
    direction: SortDirection
}>;
export const setSortByDirection = (payload: SetSortByDirectionAction['payload']): SetSortByDirectionAction =>
    ({type: actionNames.SORT_TESTS_SET_DIRECTION, payload});

export type SortTestsAction =
    | SetCurrentSortByExpressionAction
    | SetSortByDirectionAction;
