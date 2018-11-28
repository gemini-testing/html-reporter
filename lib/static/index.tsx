'use strict';

import React from 'react';
import {render} from 'react-dom';
import {Provider} from 'react-redux';
import store from './modules/store';
import Report from './components/report';

const rootEl = document.querySelector<HTMLDivElement>('#app');
render(
    <Provider store={store}>
        <Report/>
    </Provider>,
    rootEl
);
