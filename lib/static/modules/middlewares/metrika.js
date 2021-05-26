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
            metrika.acceptScreenshot();

            return next(action);
        }

        case actionNames.ACCEPT_OPENED_SCREENSHOTS: {
            const payload = get(action, 'payload', []);
            metrika.acceptOpenedScreenshots({acceptedImagesCount: payload.length});

            return next(action);
        }

        default:
            return next(action);
    }
};
