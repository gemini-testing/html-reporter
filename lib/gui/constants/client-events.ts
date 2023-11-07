import {ValueOf} from 'type-fest';

export const ClientEvents = {
    BEGIN_SUITE: 'beginSuite',
    BEGIN_STATE: 'beginState',

    TEST_RESULT: 'testResult',

    RETRY: 'retry',
    ERROR: 'err',

    END: 'end'
} as const;

export type ClientEvents = typeof ClientEvents;

export type ClientEvent = ValueOf<ClientEvents>;
