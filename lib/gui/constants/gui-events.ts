import type {ValueOf} from 'type-fest';

export const GuiEvents = {
    SERVER_INIT: 'serverInit',
    SERVER_READY: 'serverReady'
} as const;

export type GuiEvents = typeof GuiEvents;

export type GuiEvent = ValueOf<GuiEvents>;
