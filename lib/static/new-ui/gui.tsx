import React, {useEffect} from 'react';
import ReactDOM from 'react-dom';
import {App} from './App';
import store from '../modules/store';
import {finGuiReport, initGuiReport} from '../modules/actions';

const rootEl = document.getElementById('app');

function Gui(): JSX.Element {
    useEffect(() => {
        store.dispatch(initGuiReport());

        return () => {
            store.dispatch(finGuiReport());
        };
    }, []);

    return <App/>;
}

ReactDOM.render(<Gui />, rootEl);
