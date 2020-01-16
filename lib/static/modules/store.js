'use strict';

import {applyMiddleware, compose, createStore} from 'redux';
import thunk from 'redux-thunk';
import logger from 'redux-logger';
import reducer from './reducers';

const middlewares = [thunk];

if (process.env.NODE_ENV !== 'production') {
    middlewares.push(logger);
}

const createStoreWithMiddlewares = compose(applyMiddleware(...middlewares))(createStore);

export default createStoreWithMiddlewares(reducer, {});
