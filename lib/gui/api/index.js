'use strict';

const ApiFacade = require('./facade');

module.exports = class Api {
    static create(hermione) {
        return new Api(hermione);
    }

    constructor(hermione) {
        this._gui = hermione.gui = ApiFacade.create();
    }

    async initServer(server) {
        await this._gui.emitAsync(this._gui.events.SERVER_INIT, server);
    }

    async serverReady(data) {
        await this._gui.emitAsync(this._gui.events.SERVER_READY, data);
    }
};
