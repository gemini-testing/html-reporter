'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import store from './modules/store';
import Gui from './components/gui';

const rootEl = document.getElementById('app');

ReactDOM.render(
    <Provider store={store}>
        <Gui/>
    </Provider>,
    rootEl
);
