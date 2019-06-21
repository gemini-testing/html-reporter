'use strict';

const ApiFacade = require('./facade');

module.exports = class Api {
    static create(tool) {
        return new Api(tool);
    }

    constructor(tool) {
        this._gui = tool.gui = ApiFacade.create();
    }

    initServer(server) {
        this._gui.emit(this._gui.events.SERVER_INIT, server);
    }

    serverReady(data) {
        this._gui.emit(this._gui.events.SERVER_READY, data);
    }
};
