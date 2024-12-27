'use strict';

import {applyMiddleware, compose, createStore} from 'redux';
import thunk from 'redux-thunk';
import reducer from './reducers';
import {getMetrikaMiddleware} from './middlewares/metrika';
import {YandexMetrika} from './yandex-metrika';
import localStorage from './middlewares/local-storage';

const middlewares = [thunk, localStorage];

let composeEnhancers = compose;

if (process.env.NODE_ENV !== 'production') {
    const logger = require('redux-logger').default;
    middlewares.push(logger);

    if (window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) {
        composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
    }
}

const metrikaConfig = (window.data || {}).config?.yandexMetrika;
const areAnalyticsEnabled = metrikaConfig?.enabled && metrikaConfig?.counterId;
const isYaMetrikaAvailable = window.ym && typeof window.ym === 'function';

if (areAnalyticsEnabled && isYaMetrikaAvailable) {
    const metrika = new YandexMetrika();
    const metrikaMiddleware = getMetrikaMiddleware(metrika);

    middlewares.push(metrikaMiddleware);
}

const createStoreWithMiddlewares = composeEnhancers(applyMiddleware(...middlewares))(createStore);

export default createStoreWithMiddlewares(reducer, {});
