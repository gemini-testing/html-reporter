import {ApiFacade} from './facade';
import type {Express} from 'express';

export interface ServerReadyData {
    url: string;
}

export interface ServerStartData extends ServerReadyData {
    ready: Promise<void>;
}

export interface InitializationProgress {
    phase: string;
    duration: number;
}

export type InitializationProgressHandler = (progress: InitializationProgress) => void | Promise<void>;

export class GuiApi {
    private _gui: ApiFacade;

    static create<T extends GuiApi>(this: new () => T): T {
        return new this();
    }

    constructor() {
        this._gui = ApiFacade.create();
    }

    async initServer(server: Express): Promise<void> {
        await this._gui.emitAsync(this._gui.events.SERVER_INIT, server);
    }

    async serverListening(data: ServerReadyData): Promise<void> {
        await this._gui.emitAsync(this._gui.events.SERVER_LISTENING, data);
    }

    async initializationProgress(data: InitializationProgress): Promise<void> {
        await this._gui.emitAsync(this._gui.events.INITIALIZATION_PROGRESS, data);
    }

    async serverReady(data: ServerReadyData): Promise<void> {
        await this._gui.emitAsync(this._gui.events.SERVER_READY, data);
    }

    get gui(): ApiFacade {
        return this._gui;
    }
}
