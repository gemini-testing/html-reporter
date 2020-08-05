'use strict';

import {applyMiddleware, compose, createStore} from 'redux';
import thunk from 'redux-thunk';
import logger from 'redux-logger';
import reducer from './reducers';
import metrika from './middlewares/metrika';
import YandexMetrika from './yandex-metrika';

const middlewares = [thunk, metrika(YandexMetrika)];

if (process.env.NODE_ENV !== 'production') {
    middlewares.push(logger);
}

const createStoreWithMiddlewares = compose(applyMiddleware(...middlewares))(createStore);

export default createStoreWithMiddlewares(reducer, {});
