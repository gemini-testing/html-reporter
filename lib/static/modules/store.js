'use strict';

import {createStore, applyMiddleware, compose} from 'redux';
import thunk from 'redux-thunk';
import logger from 'redux-logger';
import reducer from './reducer';

const middlewares = [thunk];

if (process.env.NODE_ENV !== 'production') {
    middlewares.push(logger);
}

export default compose(applyMiddleware(...middlewares))(createStore)(reducer);
