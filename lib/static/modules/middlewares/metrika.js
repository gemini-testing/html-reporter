import {get} from 'lodash';
import actionNames from '../action-names';

import {measurePerformance} from '../web-vitals';

let metrika;

export default metrikaClass => store => next => action => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT: {
            const startLoadTime = Date.now();

            const {config: pluginConfig} = action.payload;
            const ymConfig = get(pluginConfig, 'yandexMetrika', {});

            if (!ymConfig.counterNumber) {
                return next(action);
            }

            metrika = metrikaClass.create(ymConfig);

            measurePerformance(({name, value}) => {
                const intValue = Math.round(name === 'CLS' ? value * 1000 : value);
                metrika.sendVisitParams({[name]: intValue});
            });

            const result = next(action);
            const state = store.getState();
            const testsCount = get(state, 'tree.browsers.allIds.length', 0);

            metrika.sendVisitParams({
                [action.type]: Date.now() - startLoadTime,
                initView: state.view,
                testsCount
            });

            return result;
        }

        case actionNames.ACCEPT_SCREENSHOT: {
            execOnMetrikaEnabled(() => {
                metrika.acceptScreenshot();
                sendCounterId(action.type);
            });

            return next(action);
        }

        case actionNames.ACCEPT_OPENED_SCREENSHOTS: {
            execOnMetrikaEnabled(() => {
                const payload = get(action, 'payload', []);
                metrika.acceptOpenedScreenshots({acceptedImagesCount: payload.length});
                sendCounterId(action.type);
            });

            return next(action);
        }

        case actionNames.RUN_ALL_TESTS:
        case actionNames.RUN_FAILED_TESTS:
        case actionNames.RETRY_SUITE:
        case actionNames.RETRY_TEST:
        case actionNames.VIEW_SHOW_ALL:
        case actionNames.VIEW_SHOW_FAILED:
        case actionNames.VIEW_EXPAND_ALL:
        case actionNames.VIEW_COLLAPSE_ALL:
        case actionNames.VIEW_EXPAND_ERRORS:
        case actionNames.VIEW_EXPAND_RETRIES:
        case actionNames.VIEW_TOGGLE_SKIPPED:
        case actionNames.VIEW_TOGGLE_ONLY_DIFF:
        case actionNames.VIEW_TOGGLE_SCALE_IMAGES:
        case actionNames.VIEW_TOGGLE_LAZY_LOAD_IMAGES:
        case actionNames.VIEW_TOGGLE_GROUP_BY_ERROR:
        case actionNames.VIEW_UPDATE_BASE_HOST:
        case actionNames.BROWSERS_SELECTED:
        case actionNames.VIEW_UPDATE_FILTER_BY_NAME:
        case actionNames.VIEW_SET_STRICT_MATCH_FILTER:
        case actionNames.RUN_CUSTOM_GUI_ACTION:
        case actionNames.COPY_SUITE_NAME:
        case actionNames.VIEW_IN_BROWSER:
        case actionNames.COPY_TEST_LINK:
        case actionNames.TOGGLE_SUITE_SECTION:
        case actionNames.TOGGLE_BROWSER_SECTION: {
            execOnMetrikaEnabled(() => {
                sendCounterId(action.type);
            });

            return next(action);
        }

        case actionNames.OPEN_MODAL:
        case actionNames.CLOSE_MODAL: {
            execOnMetrikaEnabled(() => {
                const modalId = get(action, 'payload.id', action.type);
                sendCounterId(modalId);
            });

            return next(action);
        }

        case actionNames.TOGGLE_STATE_RESULT:
        case actionNames.CHANGE_TEST_RETRY: {
            execOnMetrikaEnabled(() => {
                const isUserClick = get(action, 'payload.isUserClick', false);

                if (isUserClick) {
                    sendCounterId(action.type);
                }
            });

            return next(action);
        }

        default:
            return next(action);
    }
};

function execOnMetrikaEnabled(cb) {
    if (metrika) {
        cb();
    }
}

function sendCounterId(counterId) {
    metrika.sendVisitParams({counterId});
}
