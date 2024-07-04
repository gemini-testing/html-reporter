import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import store from './modules/store';
import Gui from './components/gui';
import {ThemeProvider} from '@gravity-ui/uikit';

import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';

const rootEl = document.getElementById('app');

ReactDOM.render(
    <ThemeProvider theme='light'>
        <Provider store={store}>
            <Gui/>
        </Provider>
    </ThemeProvider>,
    rootEl
);
