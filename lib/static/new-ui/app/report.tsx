import React, {ReactNode, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './App';
import store from '../../modules/store';
import {initStaticReport, finStaticReport} from '../../modules/actions';

const rootEl = document.getElementById('app') as HTMLDivElement;
const root = createRoot(rootEl);

function Gui(): ReactNode {
    useEffect(() => {
        store.dispatch(initStaticReport());

        return () => {
            store.dispatch(finStaticReport());
        };
    }, []);

    return <App/>;
}

root.render(<Gui />);
