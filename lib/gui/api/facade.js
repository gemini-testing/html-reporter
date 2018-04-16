'use strict';

const {EventEmitter} = require('events');
const guiEvents = require('../constants/gui-events');

module.exports = class ApiFacade extends EventEmitter {
    static create() {
        return new ApiFacade();
    }

    constructor() {
        super();

        this.events = guiEvents;
    }
};
