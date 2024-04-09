import {ApiFacade} from './facade';
import type Testplane from 'testplane';
import {Express} from 'express';

export interface ServerReadyData {
    url: string;
}

type TestplaneWithGui = Testplane & { gui: ApiFacade };

export class Api {
    private _gui: ApiFacade;

    static create<T extends Api>(this: new (testplane: TestplaneWithGui) => T, testplane: TestplaneWithGui): T {
        return new this(testplane);
    }

    constructor(testplane: TestplaneWithGui) {
        this._gui = testplane.gui = ApiFacade.create();
    }

    async initServer(server: Express): Promise<void> {
        await this._gui.emitAsync(this._gui.events.SERVER_INIT, server);
    }

    async serverReady(data: ServerReadyData): Promise<void> {
        await this._gui.emitAsync(this._gui.events.SERVER_READY, data);
    }
}
