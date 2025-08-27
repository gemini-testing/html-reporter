import {ApiFacade} from './facade';
import type {Express} from 'express';

export interface ServerReadyData {
    url: string;
}

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

    async serverReady(data: ServerReadyData): Promise<void> {
        await this._gui.emitAsync(this._gui.events.SERVER_READY, data);
    }

    get gui(): ApiFacade {
        return this._gui;
    }
}
