import React, {ReactNode, useEffect} from 'react';
import {createRoot} from 'react-dom/client';

import {ClientEvents} from '@/gui/constants';
import {App} from './App';
import store from '../../modules/store';
import {finGuiReport, thunkInitGuiReport, suiteBegin, testBegin, testResult, testsEnd} from '../../modules/actions';
import {setGuiServerConnectionStatus} from '@/static/modules/actions/gui-server-connection';
import actionNames from '@/static/modules/action-names';

const rootEl = document.getElementById('app') as HTMLDivElement;
const root = createRoot(rootEl);

function Gui(): ReactNode {
    const subscribeToEvents = (): void => {
        const eventSource = new EventSource('/events');

        eventSource.addEventListener(ClientEvents.CONNECTED, (): void => {
            store.dispatch({type: actionNames.UPDATE_LOADING_VISIBILITY, payload: false});

            store.dispatch(setGuiServerConnectionStatus({isConnected: true}));
        });

        eventSource.onerror = (): void => {
            store.dispatch({type: actionNames.UPDATE_LOADING_IS_IN_PROGRESS, payload: true});
            store.dispatch({type: actionNames.UPDATE_LOADING_TITLE, payload: 'Lost connection to Testplane UI server. Trying to reconnect'});
            store.dispatch({type: actionNames.UPDATE_LOADING_VISIBILITY, payload: true});

            store.dispatch(setGuiServerConnectionStatus({isConnected: false}));
        };

        eventSource.addEventListener(ClientEvents.BEGIN_SUITE, (e) => {
            const data = JSON.parse(e.data);
            store.dispatch(suiteBegin(data));
        });

        eventSource.addEventListener(ClientEvents.BEGIN_STATE, (e) => {
            const data = JSON.parse(e.data);
            store.dispatch(testBegin(data));
        });

        [ClientEvents.TEST_RESULT, ClientEvents.ERROR].forEach((eventName) => {
            eventSource.addEventListener(eventName, (e) => {
                const data = JSON.parse(e.data);
                store.dispatch(testResult(data));
            });
        });

        eventSource.addEventListener(ClientEvents.END, () => {
            store.dispatch(testsEnd());
        });
    };

    useEffect(() => {
        store.dispatch(thunkInitGuiReport({isNewUi: true}));
        subscribeToEvents();

        return () => {
            store.dispatch(finGuiReport());
        };
    }, []);

    return <App/>;
}

root.render(<Gui />);
