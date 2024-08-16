import React, {useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './App';
import store from '../../modules/store';
import {finGuiReport, initGuiReport} from '../../modules/actions';

const rootEl = document.getElementById('app') as HTMLDivElement;
const root = createRoot(rootEl);

function Gui(): React.JSX.Element {
    useEffect(() => {
        store.dispatch(initGuiReport());

        return () => {
            store.dispatch(finGuiReport());
        };
    }, []);

    return <App/>;
}

root.render(<Gui />);
