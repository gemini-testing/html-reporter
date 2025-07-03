import {Pages, SortDirection, State} from '@/static/new-ui/types/store';
import {SomeAction} from '@/static/modules/actions/types';
import actionNames from '@/static/modules/action-names';
import {applyStateUpdate} from '@/static/modules/utils';
import {
    DEFAULT_AVAILABLE_EXPRESSIONS,
    SORT_BY_DURATION,
    SORT_BY_FAILED_RETRIES,
    SORT_BY_NAME,
    SORT_BY_RELEVANCE,
    SORT_BY_START_TIME,
    SORT_BY_TESTS_COUNT
} from '@/static/constants/sort-tests';

const shouldRememberPreviousState = (currentExpressionIds: string[]): boolean => {
    return currentExpressionIds[0] !== SORT_BY_RELEVANCE.id && currentExpressionIds[0] !== SORT_BY_TESTS_COUNT.id;
};

export default (state: State, action: SomeAction): State => {
    switch (action.type) {
        case actionNames.INIT_STATIC_REPORT:
        case actionNames.INIT_GUI_REPORT: {
            const availableExpressions = DEFAULT_AVAILABLE_EXPRESSIONS;

            return applyStateUpdate(state, {
                app: {
                    sortTestsData: {
                        availableExpressions,
                        currentDirection: SortDirection.Asc,
                        currentExpressionIds: [availableExpressions[0].id],
                        previousDirection: SortDirection.Asc,
                        previousExpressionIds: [availableExpressions[0].id]
                    }
                }
            });
        }
        case actionNames.SORT_TESTS_SET_CURRENT_EXPRESSION: {
            const sortTestsData: Partial<State['app']['sortTestsData']> = {
                currentExpressionIds: action.payload.expressionIds
            };

            if (action.payload.expressionIds[0] === SORT_BY_NAME.id) {
                sortTestsData.currentDirection = SortDirection.Asc;
            } else if (action.payload.expressionIds[0] === SORT_BY_FAILED_RETRIES.id || action.payload.expressionIds[0] === SORT_BY_TESTS_COUNT.id) {
                sortTestsData.currentDirection = SortDirection.Desc;
            } else if (action.payload.expressionIds[0] === SORT_BY_START_TIME.id) {
                sortTestsData.currentDirection = SortDirection.Asc;
            } else if (action.payload.expressionIds[0] === SORT_BY_DURATION.id) {
                sortTestsData.currentDirection = SortDirection.Desc;
            } else if (action.payload.expressionIds[0] === SORT_BY_RELEVANCE.id) {
                sortTestsData.currentDirection = SortDirection.Desc;
            }

            if (shouldRememberPreviousState(action.payload.expressionIds)) {
                sortTestsData.previousExpressionIds = action.payload.expressionIds;
                sortTestsData.previousDirection = sortTestsData.currentDirection;
            }

            return applyStateUpdate(state, {
                app: {sortTestsData}
            });
        }
        case actionNames.SORT_TESTS_SET_DIRECTION: {
            const sortTestsData: Partial<State['app']['sortTestsData']> = {
                currentDirection: action.payload.direction
            };

            if (shouldRememberPreviousState(state.app.sortTestsData.currentExpressionIds)) {
                sortTestsData.previousDirection = action.payload.direction;
                sortTestsData.previousExpressionIds = state.app.sortTestsData.currentExpressionIds;
            }

            return applyStateUpdate(state, {
                app: {sortTestsData}
            });
        }
        case actionNames.GROUP_TESTS_SET_CURRENT_EXPRESSION: {
            const sortTestsData: Partial<State['app']['sortTestsData']> = {};
            const availableExpressions = [...state.app.sortTestsData.availableExpressions];

            if (action.payload.expressionIds.length > 0) {
                availableExpressions.push(SORT_BY_TESTS_COUNT);
            } else {
                availableExpressions.splice(availableExpressions.indexOf(SORT_BY_TESTS_COUNT), 1);
                sortTestsData.currentExpressionIds = state.app.sortTestsData.previousExpressionIds;
                sortTestsData.currentDirection = state.app.sortTestsData.previousDirection;
            }

            sortTestsData.availableExpressions = availableExpressions;

            return applyStateUpdate(state, {
                app: {sortTestsData}
            });
        }
        case actionNames.VIEW_UPDATE_FILTER_BY_NAME: {
            if (action.payload.page === Pages.suitesPage) {
                const sortTestsData: Partial<State['app']['sortTestsData']> = {};
                const availableExpressions = [...state.app.sortTestsData.availableExpressions];
                const previousExpressionIds = state.app.sortTestsData.previousExpressionIds;
                const previousDirection = state.app.sortTestsData.previousDirection;

                if (action.payload.data.length > 0 && !availableExpressions.some(expr => expr.id === SORT_BY_RELEVANCE.id)) {
                    sortTestsData.availableExpressions = [...availableExpressions, SORT_BY_RELEVANCE];
                    sortTestsData.currentExpressionIds = [SORT_BY_RELEVANCE.id];
                    sortTestsData.currentDirection = SortDirection.Desc;
                } else if (action.payload.data.length === 0 && availableExpressions.some(expr => expr.id === SORT_BY_RELEVANCE.id)) {
                    sortTestsData.availableExpressions = availableExpressions.filter(expr => expr.id !== SORT_BY_RELEVANCE.id);
                    sortTestsData.currentExpressionIds = previousExpressionIds;
                    sortTestsData.currentDirection = previousDirection;
                }

                return applyStateUpdate(state, {
                    app: {sortTestsData}
                });
            }

            return state;
        }
        default:
            return state;
    }
};
