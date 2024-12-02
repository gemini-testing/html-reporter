import {SortByExpression, SortType, State} from '@/static/new-ui/types/store';
import {SomeAction} from '@/static/modules/actions/types';
import actionNames from '@/static/modules/action-names';
import {applyStateUpdate} from '@/static/modules/utils';

export default (state: State, action: SomeAction): State => {
    switch (action.type) {
        case actionNames.INIT_STATIC_REPORT:
        case actionNames.INIT_GUI_REPORT: {
            const availableExpressions: SortByExpression[] = [
                {id: 'by-name', label: 'name', type: SortType.ByName},
                {id: 'by-retries', label: 'failed retries', type: SortType.ByRetries}
            ];

            return applyStateUpdate(state, {
                app: {
                    sortTestsData: {
                        availableExpressions
                    }
                }
            });
        }
        case actionNames.SORT_TESTS_SET_CURRENT_EXPRESSION: {
            return applyStateUpdate(state, {
                app: {
                    sortTestsData: {
                        currentExpressionIds: action.payload.expressionIds
                    }
                }
            });
        }
        case actionNames.SORT_TESTS_SET_DIRECTION: {
            return applyStateUpdate(state, {
                app: {
                    sortTestsData: {
                        currentDirection: action.payload.direction
                    }
                }
            });
        }
        default:
            return state;
    }
};
