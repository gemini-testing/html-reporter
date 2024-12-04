import {SortByExpression, SortDirection, State} from '@/static/new-ui/types/store';
import {SomeAction} from '@/static/modules/actions/types';
import actionNames from '@/static/modules/action-names';
import {applyStateUpdate} from '@/static/modules/utils';
import {SORT_BY_FAILED_RETRIES, SORT_BY_NAME, SORT_BY_TESTS_COUNT} from '@/static/constants/sort-tests';

export default (state: State, action: SomeAction): State => {
    switch (action.type) {
        case actionNames.INIT_STATIC_REPORT:
        case actionNames.INIT_GUI_REPORT: {
            const availableExpressions: SortByExpression[] = [
                SORT_BY_NAME,
                SORT_BY_FAILED_RETRIES
            ];

            return applyStateUpdate(state, {
                app: {
                    sortTestsData: {
                        availableExpressions,
                        currentDirection: SortDirection.Asc,
                        currentExpressionIds: [availableExpressions[0].id]
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
        case actionNames.GROUP_TESTS_SET_CURRENT_EXPRESSION: {
            let availableExpressions: SortByExpression[];
            if (action.payload.expressionIds.length > 0) {
                availableExpressions = [
                    SORT_BY_NAME,
                    SORT_BY_FAILED_RETRIES,
                    SORT_BY_TESTS_COUNT
                ];
            } else {
                availableExpressions = [
                    SORT_BY_NAME,
                    SORT_BY_FAILED_RETRIES
                ];
            }
            return applyStateUpdate(state, {
                app: {
                    sortTestsData: {
                        availableExpressions
                    }
                }
            });
        }
        default:
            return state;
    }
};
