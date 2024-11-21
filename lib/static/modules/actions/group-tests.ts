import actionNames from '@/static/modules/action-names';
import {Action} from '@/static/modules/actions/types';

type SetCurrentGroupByExpressionAction = Action<typeof actionNames.GROUP_TESTS_SET_CURRENT_EXPRESSION, {
    expressionIds: string[];
}>;

export const setCurrentGroupByExpression = (payload: SetCurrentGroupByExpressionAction['payload']): SetCurrentGroupByExpressionAction =>
    ({type: actionNames.GROUP_TESTS_SET_CURRENT_EXPRESSION, payload});

export type GroupTestsAction = SetCurrentGroupByExpressionAction;
