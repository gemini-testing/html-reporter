import {Eye, ListCheck} from '@gravity-ui/icons';
import {ThemeProvider, ToasterComponent, ToasterProvider} from '@gravity-ui/uikit';
import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';
import React, {ReactNode, StrictMode} from 'react';
import {Provider} from 'react-redux';
import {HashRouter, Navigate, Route, Routes} from 'react-router-dom';

import {LoadingBar} from '@/static/new-ui/components/LoadingBar';
import {GuiniToolbarOverlay} from '@/static/new-ui/components/GuiniToolbarOverlay';
import {MainLayout} from '../components/MainLayout';
import {SuitesPage} from '../features/suites/components/SuitesPage';
import {VisualChecksPage} from '../features/visual-checks/components/VisualChecksPage';
import '../../new-ui.css';
import store from '../../modules/store';

export function App(): ReactNode {
    const pages = [
        {
            title: 'Suites',
            url: '/suites',
            icon: ListCheck,
            element: <SuitesPage/>,
            children: [<Route key={'suite'} path=':suiteId' element={<SuitesPage/>} />]
        },
        {title: 'Visual Checks', url: '/visual-checks', icon: Eye, element: <VisualChecksPage/>}
    ];

    return <StrictMode>
        <ThemeProvider theme='light'>
            <ToasterProvider>
                <Provider store={store}>
                    <HashRouter>
                        <MainLayout menuItems={pages}>
                            <LoadingBar/>
                            <Routes>
                                <Route element={<Navigate to={'/suites'}/>} path={'/'}/>
                                {pages.map(page => <Route element={page.element} path={page.url} key={page.url}>{page.children}</Route>)}
                            </Routes>
                            <GuiniToolbarOverlay/>
                            <ToasterComponent />
                        </MainLayout>
                    </HashRouter>
                </Provider>
            </ToasterProvider>
        </ThemeProvider>
    </StrictMode>;
}
