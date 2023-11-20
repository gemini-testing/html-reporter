import {ApiFacade} from './facade';
import Hermione from 'hermione';
import {Express} from 'express';

interface GuiFacade {
    gui: ApiFacade;
}

export interface ServerReadyData {
    url: string;
}

export class Api {
    private _gui: ApiFacade;

    static create<T extends Api>(this: new (hermione: Hermione & GuiFacade) => T, hermione: Hermione & GuiFacade): T {
        return new this(hermione);
    }

    constructor(hermione: Hermione & GuiFacade) {
        this._gui = hermione.gui = ApiFacade.create();
    }

    async initServer(server: Express): Promise<void> {
        await this._gui.emitAsync(this._gui.events.SERVER_INIT, server);
    }

    async serverReady(data: ServerReadyData): Promise<void> {
        await this._gui.emitAsync(this._gui.events.SERVER_READY, data);
    }
}
