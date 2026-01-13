import {Eye, ListCheck} from '@gravity-ui/icons';
import {ThemeProvider, Toaster, ToasterComponent, ToasterProvider} from '@gravity-ui/uikit';
import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';
import React, {ReactNode, StrictMode} from 'react';
import {Provider} from 'react-redux';
import {HashRouter, Navigate, Route, Routes} from 'react-router-dom';

import {LoadingBar} from '@/static/new-ui/components/LoadingBar';
import {GuiniToolbarOverlay} from '@/static/new-ui/components/GuiniToolbarOverlay';
import {AutoRun} from '@/static/new-ui/components/AutoRun';
import {MainLayout} from '../components/MainLayout';
import {SuitesPage} from '../features/suites/components/SuitesPage';
import {VisualChecksPage} from '../features/visual-checks/components/VisualChecksPage';
import '../../new-ui.css';
import store from '../../modules/store';
import {CustomScripts} from '@/static/new-ui/components/CustomScripts';
import {State} from '@/static/new-ui/types/store';
import {AnalyticsProvider} from '@/static/new-ui/providers/analytics';
import {MetrikaScript} from '@/static/new-ui/components/MetrikaScript';
import {ErrorHandler} from '../features/error-handling/components/ErrorHandling';
import FaviconChanger from '../../components/favicon-changer';
import {PathNames} from '@/constants';

const toaster = new Toaster();

const pages = [
    {
        title: 'Suites',
        url: PathNames.suites,
        icon: ListCheck,
        element: <SuitesPage/>,
        children: [<Route key={'suite'} path='/suites/:hash?/:browser?/:attempt?/:stateName?' element={<SuitesPage/>} />]
    },
    {
        title: 'Visual Checks',
        url: PathNames.visualChecks,
        icon: Eye,
        element: <VisualChecksPage/>,
        children: [<Route key={'image'} path='/visual-checks/:hash?/:browser?/:attempt?/:stateName?' element={<VisualChecksPage/>} />]
    }
];

export function App(): ReactNode {
    const customScripts = (store.getState() as State).config.customScripts;

    return <StrictMode>
        <ErrorHandler.Boundary fallback={<ErrorHandler.FallbackAppCrash />}>
            <CustomScripts scripts={customScripts} />
            <ThemeProvider theme='light'>
                <ToasterProvider toaster={toaster}>
                    <Provider store={store}>
                        <MetrikaScript/>
                        <FaviconChanger />
                        <AutoRun />
                        <AnalyticsProvider>
                            <HashRouter>
                                <ErrorHandler.Boundary fallback={<ErrorHandler.FallbackAppCrash />}>
                                    <MainLayout pages={pages}>
                                        <LoadingBar/>
                                        <Routes>
                                            <Route element={<Navigate to={PathNames.suites}/>} path={'/'}/>
                                            {pages.map(page => (
                                                <Route element={
                                                    <ErrorHandler.Boundary watchFor={[page.url]} fallback={<ErrorHandler.FallbackAppCrash />}>
                                                        { page.element}
                                                    </ErrorHandler.Boundary>
                                                } path={page.url} key={page.url}>
                                                    {page.children}
                                                </Route>
                                            ))}
                                        </Routes>
                                        <GuiniToolbarOverlay/>
                                        <ToasterComponent />
                                    </MainLayout>
                                </ErrorHandler.Boundary>
                            </HashRouter>
                        </AnalyticsProvider>
                    </Provider>
                </ToasterProvider>
            </ThemeProvider>
        </ErrorHandler.Boundary>
    </StrictMode>;
}
