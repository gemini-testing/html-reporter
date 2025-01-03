import actionNames from '@/static/modules/action-names';
import {Action} from '@/static/modules/actions/types';

/** This action is used in old UI only */
type GroupTestsByKeyAction = Action<typeof actionNames.GROUP_TESTS_BY_KEY, string | undefined>;
export const groupTestsByKey = (payload: string | undefined): GroupTestsByKeyAction => ({type: actionNames.GROUP_TESTS_BY_KEY, payload});

type SetCurrentGroupByExpressionAction = Action<typeof actionNames.GROUP_TESTS_SET_CURRENT_EXPRESSION, {
    expressionIds: string[];
}>;
export const setCurrentGroupByExpression = (payload: SetCurrentGroupByExpressionAction['payload']): SetCurrentGroupByExpressionAction =>
    ({type: actionNames.GROUP_TESTS_SET_CURRENT_EXPRESSION, payload});

export type GroupTestsAction =
    | SetCurrentGroupByExpressionAction
    | GroupTestsByKeyAction;
