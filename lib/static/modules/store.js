'use strict';

import {createStore, applyMiddleware} from 'redux';
import thunk from 'redux-thunk';
import reducer from './reducer';

const middlewares = [thunk];

if (process.env.NODE_ENV !== 'production') {
    const logger = require('redux-logger');
    middlewares.push(logger);
}

export default createStore(reducer, applyMiddleware(...middlewares));
