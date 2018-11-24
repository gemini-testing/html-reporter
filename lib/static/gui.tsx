'use strict';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import * as store from './modules/store';
import * as Gui from './components/gui';

const rootEl = document.getElementById('app');

ReactDOM.render(
    <Provider store={store}>
        <Gui/>
    </Provider>,
    rootEl
);
