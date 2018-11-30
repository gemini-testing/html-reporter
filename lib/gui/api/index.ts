'use strict';
const ApiFacade = require('./facade');
import * as express from 'express';

export interface Tool {
    gui: { [key: string]: any }
}

module.exports = class Api {
    private _gui: { [key: string]: any }

    static create(tool: Tool) {
        return new Api(tool);
    }

    constructor(tool: Tool) {
        this._gui = tool.gui = ApiFacade.create();
    }

    initServer(server: express.Application) {
        this._gui.emit(this._gui.events.SERVER_INIT, server);
    }
};
