import type {ValueOf} from 'type-fest';

export const ClientEvents = {
    BEGIN_SUITE: 'beginSuite',
    BEGIN_STATE: 'beginState',

    TEST_RESULT: 'testResult',

    RETRY: 'retry',
    ERROR: 'err',

    END: 'end',

    REPEAT_LEFT: 'repeatsLeft',

    CONNECTED: 'connected',

    DOM_SNAPSHOTS: 'DOM_SNAPSHOTS',

    TESTS_REFRESH_STARTED: 'testsRefreshStarted',
    TESTS_REFRESHED: 'testsRefreshed',
    TESTS_REFRESH_FAILED: 'testsRefreshFailed'
} as const;

export type ClientEvents = typeof ClientEvents;

export type ClientEvent = ValueOf<ClientEvents>;
