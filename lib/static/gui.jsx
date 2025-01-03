import React from 'react';
import {createRoot} from 'react-dom/client';
import {Provider} from 'react-redux';
import store from './modules/store';
import Gui from './components/gui';
import {ThemeProvider} from '@gravity-ui/uikit';

import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';
import {AnalyticsProvider} from '@/static/new-ui/providers/analytics';

const rootEl = document.getElementById('app');
const root = createRoot(rootEl);

root.render(
    <ThemeProvider theme='light'>
        <Provider store={store}>
            <AnalyticsProvider>
                <Gui/>
            </AnalyticsProvider>
        </Provider>
    </ThemeProvider>
);
