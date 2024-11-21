import React, {ReactNode, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './App';
import store from '../../modules/store';
import {thunkInitStaticReport, finStaticReport} from '../../modules/actions';

const rootEl = document.getElementById('app') as HTMLDivElement;
const root = createRoot(rootEl);

function Report(): ReactNode {
    useEffect(() => {
        store.dispatch(thunkInitStaticReport({isNewUi: true}));

        return () => {
            store.dispatch(finStaticReport());
        };
    }, []);

    return <App/>;
}

root.render(<Report />);
