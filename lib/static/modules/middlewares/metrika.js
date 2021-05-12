import {get} from 'lodash';
import actionNames from '../action-names';

let metrika;

export default metrikaClass => store => next => action => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT: {
            const result = next(action);
            const config = get(store.getState(), 'config.yandexMetrika', {});

            metrika = metrikaClass.create(config);

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
