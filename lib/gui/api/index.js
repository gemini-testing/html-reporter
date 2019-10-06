'use strict';

const ApiFacade = require('./facade');

module.exports = class Api {
    static create(hermione) {
        return new Api(hermione);
    }

    constructor(hermione) {
        this._gui = hermione.gui = ApiFacade.create();
    }

    initServer(server) {
        this._gui.emit(this._gui.events.SERVER_INIT, server);
    }

    serverReady(data) {
        this._gui.emit(this._gui.events.SERVER_READY, data);
    }
};
