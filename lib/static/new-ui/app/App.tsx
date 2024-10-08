import {ThemeProvider} from '@gravity-ui/uikit';
import React, {ReactNode, StrictMode} from 'react';
import {MainLayout} from '../components/MainLayout';
import {HashRouter, Navigate, Route, Routes} from 'react-router-dom';
import {CircleInfo, Eye, ListCheck} from '@gravity-ui/icons';
import {SuitesPage} from '../features/suites/components/SuitesPage';
import {VisualChecksPage} from '../features/visual-checks/components/VisualChecksPage';
import {InfoPage} from '../features/info/components/InfoPage';

import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';
import '../../new-ui.css';
import {Provider} from 'react-redux';
import store from '../../modules/store';

export function App(): ReactNode {
    const pages = [
        {
            title: 'Suites',
            url: '/suites',
            icon: ListCheck,
            element: <SuitesPage/>,
            children: [<Route key={'suite'} path=':suiteId' element= {<SuitesPage/>} />]
        },
        {title: 'Visual Checks', url: '/visual-checks', icon: Eye, element: <VisualChecksPage/>},
        {title: 'Info', url: '/info', icon: CircleInfo, element: <InfoPage/>}
    ];

    return <StrictMode>
        <ThemeProvider theme='light'>
            <Provider store={store}>
                <HashRouter>
                    <MainLayout menuItems={pages}>
                        <Routes>
                            <Route element={<Navigate to={'/suites'}/>} path={'/'}/>
                            {pages.map(page => <Route element={page.element} path={page.url} key={page.url}>{page.children}</Route>)}
                        </Routes>
                    </MainLayout>
                </HashRouter>
            </Provider>
        </ThemeProvider>
    </StrictMode>;
}
