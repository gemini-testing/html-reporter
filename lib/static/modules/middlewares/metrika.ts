import {get, isEmpty} from 'lodash';
import {Middleware} from 'redux';

import type {YandexMetrika} from '@/static/modules/yandex-metrika';
import type {State} from '@/static/new-ui/types/store';
import {SomeAction} from '@/static/modules/actions/types';
import actionNames from '../action-names';
import {measurePerformance} from '../web-vitals';
import performanceMarks from '../../../constants/performance-marks';
import {extractPerformanceMarks} from '@/static/modules/utils/performance';

// This rule should be disabled here per redux docs: https://redux.js.org/usage/usage-with-typescript#type-checking-middleware
// eslint-disable-next-line @typescript-eslint/ban-types
export function getMetrikaMiddleware(analytics: YandexMetrika): Middleware<{}, State> {
    let reportFullyLoaded = false;

    return store => next => (action: SomeAction) => {
        switch (action.type) {
            case actionNames.INIT_GUI_REPORT:
            case actionNames.INIT_STATIC_REPORT: {
                const startLoadTime = Date.now();

                measurePerformance(({name, value}) => {
                    const intValue = Math.round(name === 'CLS' ? value * 1000 : value);
                    analytics.setVisitParams({[name]: intValue});
                });

                const result = next(action);
                const state = store.getState();
                const testsCount = get(state, 'tree.browsers.allIds.length', 0);

                analytics.setVisitParams({
                    [action.type]: Date.now() - startLoadTime,
                    initView: state.view,
                    testsCount,
                    isNewUi: Boolean(state?.app?.isNewUi)
                });

                return result;
            }

            case actionNames.BROWSERS_SELECTED: {
                analytics.trackFeatureUsage({featureName: action.type});

                const result = next(action);

                if (!reportFullyLoaded) {
                    reportFullyLoaded = true;

                    performance?.mark?.(performanceMarks.FULLY_LOADED);

                    const marks = extractPerformanceMarks();

                    if (analytics && !isEmpty(marks)) {
                        analytics.setVisitParams(marks);
                    }
                }

                return result;
            }

            case actionNames.RUN_ALL_TESTS:
            case actionNames.RUN_FAILED_TESTS:
            case actionNames.RETRY_SUITE:
            case actionNames.RETRY_TEST:
            case actionNames.CHANGE_VIEW_MODE:
            case actionNames.VIEW_EXPAND_ALL:
            case actionNames.VIEW_COLLAPSE_ALL:
            case actionNames.VIEW_EXPAND_ERRORS:
            case actionNames.VIEW_EXPAND_RETRIES:
            case actionNames.VIEW_UPDATE_BASE_HOST:
            case actionNames.SET_DIFF_MODE:
            case actionNames.VIEW_UPDATE_FILTER_BY_NAME:
            case actionNames.VIEW_SET_FILTER_MATCH_CASE:
            case actionNames.VIEW_SET_FILTER_USE_REGEX:
            case actionNames.VIEW_SET_STRICT_MATCH_FILTER:
            case actionNames.RUN_CUSTOM_GUI_ACTION:
            case actionNames.TOGGLE_SUITE_SECTION:
            case actionNames.TOGGLE_BROWSER_SECTION:
            case actionNames.TOGGLE_STATE_RESULT:
            case actionNames.CHANGE_TEST_RETRY:
            case actionNames.GROUP_TESTS_BY_KEY: {
                analytics.trackFeatureUsage({featureName: action.type});

                return next(action);
            }

            case actionNames.GROUP_TESTS_SET_CURRENT_EXPRESSION: {
                analytics.trackFeatureUsage({featureName: action.type, groupByKey: action.payload.expressionIds[0]});

                return next(action);
            }

            case actionNames.SORT_TESTS_SET_CURRENT_EXPRESSION: {
                analytics.trackFeatureUsage({
                    featureName: action.type,
                    sortByKey: action.payload.expressionIds[0],
                    sortDirection: store.getState().app.sortTestsData.currentDirection
                });

                return next(action);
            }

            case actionNames.SORT_TESTS_SET_DIRECTION: {
                analytics.trackFeatureUsage({
                    featureName: action.type,
                    sortByKey: store.getState().app.sortTestsData.currentExpressionIds[0],
                    sortDirection: action.payload.direction
                });

                return next(action);
            }

            case actionNames.OPEN_MODAL:
            case actionNames.CLOSE_MODAL: {
                const modalId = get(action, 'payload.id', action.type);
                analytics.trackFeatureUsage({featureName: modalId});

                return next(action);
            }

            default:
                return next(action);
        }
    };
}
