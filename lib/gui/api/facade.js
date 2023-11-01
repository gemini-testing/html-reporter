'use strict';

const EventEmitter2 = require('eventemitter2');
const {GuiEvents} = require('../constants/gui-events');

module.exports = class ApiFacade extends EventEmitter2 {
    static create() {
        return new ApiFacade();
    }

    constructor() {
        super();

        this.events = GuiEvents;
    }
};
