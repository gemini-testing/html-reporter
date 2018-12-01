'use strict';

import React from 'react';
import {render} from 'react-dom';
import {Provider} from 'react-redux';
import Gui from './components/gui';
import store from './modules/store';

const rootEl = document.querySelector<HTMLDivElement>('#app');
render(
    <Provider store={store}>
        <Gui/>
    </Provider>,
    rootEl
);
