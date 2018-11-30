'use strict';
const ApiFacade = require('./facade');
import {Application} from 'express';

export interface ITool {
    gui: { [key: string]: any };
}

module.exports = class Api {
    private _gui: { [key: string]: any };

    static create(tool: ITool) {
        return new Api(tool);
    }

    constructor(tool: ITool) {
        this._gui = tool.gui = ApiFacade.create();
    }

    initServer(server: Application) {
        this._gui.emit(this._gui.events.SERVER_INIT, server);
    }
};
