import {ThemeProvider} from '@gravity-ui/uikit';
import React from 'react';
import {MainLayout} from './layouts/MainLayout';
import {HashRouter, Navigate, Route, Routes} from 'react-router-dom';
import {CircleInfo, Eye, ListCheck} from '@gravity-ui/icons';
import {SuitesPage} from './pages/SuitesPage';
import {VisualChecksPage} from './pages/VisualChecksPage';
import {InfoPage} from './pages/InfoPage';

import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';
import '../new-ui.css';
import {Provider} from 'react-redux';
import store from '../modules/store';

export function App(): JSX.Element {
    const pages = [
        {title: 'Suites', url: '/suites', icon: ListCheck, element: <SuitesPage/>},
        {title: 'Visual Checks', url: '/visual-checks', icon: Eye, element: <VisualChecksPage/>},
        {title: 'Info', url: '/info', icon: CircleInfo, element: <InfoPage/>}
    ];

    return <ThemeProvider theme='light'>
        <Provider store={store}>
            <HashRouter>
                <MainLayout menuItems={pages}>
                    <Routes>
                        <Route element={<Navigate to={'/suites'}/>} path={'/'}/>
                        {pages.map(page => <Route element={page.element} path={page.url} key={page.url} />)}
                    </Routes>
                </MainLayout>
            </HashRouter>
        </Provider>
    </ThemeProvider>;
}
