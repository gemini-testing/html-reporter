import React, {ReactNode, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';

import {ClientEvents} from '@/gui/constants';
import {App} from './App';
import store from '../../modules/store';
import {
    finGuiReport,
    thunkInitGuiReport,
    suiteBegin,
    testBegin,
    testResult,
    thunkTestsEnd, setRepeatLeft, setRefreshLoading, initGuiReport
} from '../../modules/actions';
import {setGuiServerConnectionStatus} from '@/static/modules/actions/gui-server-connection';
import actionNames from '@/static/modules/action-names';
import {EventSourceProvider, useEventSource} from '@/static/new-ui/providers/event-source';
import {patchTestsTree} from '@/static/modules/actions/lifecycle';
import {refreshSearch, search} from '@/static/modules/search';

const rootEl = document.getElementById('app') as HTMLDivElement;
const root = createRoot(rootEl);
const watchRefreshStartedAt = new Map<number, number>();

function Gui(): ReactNode {
    const eventSource = useEventSource();

    const subscribeToEvents = (): void => {
        if (!eventSource) {
            return;
        }

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
            store.dispatch(thunkTestsEnd());
        });

        eventSource.addEventListener(ClientEvents.REPEAT_LEFT, (e) => {
            const data = JSON.parse(e.data);
            store.dispatch(setRepeatLeft(data.repeatLeft));
        });

        eventSource.addEventListener(ClientEvents.TESTS_REFRESH_STARTED, (e) => {
            const {performanceId} = JSON.parse(e.data) as {performanceId: number};
            watchRefreshStartedAt.set(performanceId, performance.now());
            console.info(`[watch-perf][client][#${performanceId}] refresh event started`);
            flushSync(() => {
                store.dispatch(setRefreshLoading(true));
            });
        });

        eventSource.addEventListener(ClientEvents.TESTS_REFRESHED, async (e) => {
            const handlerStartedAt = performance.now();
            let performanceId: number | string = '?';
            try {
                const parseStartedAt = performance.now();
                const data = JSON.parse(e.data);
                performanceId = data?.performance?.id ?? '?';
                console.info(`[watch-perf][client][#${performanceId}] JSON.parse: ${(performance.now() - parseStartedAt).toFixed(1)}ms`, {
                    payloadCharacters: e.data.length,
                    serverToClient: data?.performance?.serverCompletedAt
                        ? `${Date.now() - data.performance.serverCompletedAt}ms`
                        : 'unknown',
                    serverRefreshStartToClient: data?.performance?.serverStartedAt
                        ? `${Date.now() - data.performance.serverStartedAt}ms`
                        : 'unknown'
                });
                if (data) {
                    const dispatchStartedAt = performance.now();
                    if (data.replacement) {
                        const {db} = store.getState();

                        store.dispatch(initGuiReport({...data.replacement, db, isNewUi: true}));
                    } else {
                        store.dispatch(patchTestsTree(data));
                    }
                    console.info(`[watch-perf][client][#${performanceId}] Redux dispatch including selectors: ${(performance.now() - dispatchStartedAt).toFixed(1)}ms`);

                    const getSearchOptions = (): {text: string; matchCase: boolean; useRegexFilter: boolean} => {
                        const {app: filters} = store.getState();

                        return {
                            text: filters.nameFilter || '',
                            matchCase: Boolean(filters.useMatchCaseFilter),
                            useRegexFilter: Boolean(filters.useRegexFilter)
                        };
                    };

                    if (data.replacement) {
                        const {text, matchCase, useRegexFilter} = getSearchOptions();

                        await search(text, matchCase, useRegexFilter, false, store.dispatch);
                    } else {
                        await refreshSearch(
                            store.getState().tree,
                            data,
                            getSearchOptions,
                            store.dispatch,
                            typeof performanceId === 'number' ? performanceId : undefined
                        );
                    }
                }
            } finally {
                console.info(`[watch-perf][client][#${performanceId}] refreshed handler total: ${(performance.now() - handlerStartedAt).toFixed(1)}ms`);

                if (typeof performanceId === 'number') {
                    const clientStartedAt = watchRefreshStartedAt.get(performanceId);
                    if (clientStartedAt !== undefined) {
                        console.info(`[watch-perf][client][#${performanceId}] from refresh-start event to completed handler: ${(performance.now() - clientStartedAt).toFixed(1)}ms`);
                    }
                    watchRefreshStartedAt.delete(performanceId);
                }
                store.dispatch(setRefreshLoading(false));

                requestAnimationFrame(() => requestAnimationFrame(() => {
                    console.info(`[watch-perf][client][#${performanceId}] event handler + React render + next paint: ${(performance.now() - handlerStartedAt).toFixed(1)}ms`);
                }));
            }
        });

        eventSource.addEventListener(ClientEvents.TESTS_REFRESH_FAILED, () => {
            watchRefreshStartedAt.clear();
            store.dispatch(setRefreshLoading(false));
        });
    };

    useEffect(() => {
        if (!eventSource) {
            return;
        }

        store.dispatch(thunkInitGuiReport({isNewUi: true}));
        subscribeToEvents();

        return () => {
            store.dispatch(finGuiReport());
        };
    }, [eventSource]);

    return <App/>;
}

root.render(<EventSourceProvider>
    <Gui />
</EventSourceProvider>);
