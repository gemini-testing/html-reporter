'use strict';

const EventEmitter2 = require('eventemitter2');
const guiEvents = require('../constants/gui-events');

module.exports = class ApiFacade extends EventEmitter2 {
    static create() {
        return new ApiFacade();
    }

    constructor() {
        super();

        this.events = guiEvents;
    }
};
