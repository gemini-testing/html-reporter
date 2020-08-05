import {get} from 'lodash';
import actionNames from '../action-names';

let metrika;

export default metrikaClass => store => next => action => {
    switch (action.type) {
        case actionNames.VIEW_INITIAL: {
            const result = next(action);
            const config = get(store.getState(), 'reporter.config.yandexMetrika', {});

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
