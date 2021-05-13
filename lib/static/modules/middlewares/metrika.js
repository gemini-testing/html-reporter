import {get} from 'lodash';
import actionNames from '../action-names';

let metrika;

export default metrikaClass => store => next => action => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT: {
            const startLoadTime = Date.now();

            const result = next(action);
            const state = store.getState();
            const config = get(state, 'config.yandexMetrika', {});
            const testsCount = get(state, 'tree.browsers.allIds.length', 0);

            metrika = metrikaClass.create(config);

            metrika.sendVisitParams({tti: Date.now() - startLoadTime, testsCount});

            return result;
        }

        case actionNames.ACCEPT_SCREENSHOT: {
            metrika.acceptScreenshot();

            return next(action);
        }

        case actionNames.ACCEPT_OPENED_SCREENSHOTS: {
            const payload = get(action, 'payload', []);
            metrika.acceptOpenedScreenshots({count: payload.length});

            return next(action);
        }

        default:
            return next(action);
    }
};
