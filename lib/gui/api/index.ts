'use strict';
const ApiFacade = require('./facade');

module.exports = class Api {
    private _gui: any
    static create(tool: any) {
        return new Api(tool);
    }

    constructor(tool: {gui: any}) {
        this._gui = tool.gui = ApiFacade.create();
    }

    initServer(server: any) {
        this._gui.emit(this._gui.events.SERVER_INIT, server);
    }
};
