'use strict';

const {AsyncEmitter} = require('gemini-core').events;
const guiEvents = require('../constants/gui-events');

module.exports = class ApiFacade extends AsyncEmitter {
    static create() {
        return new ApiFacade();
    }

    constructor() {
        super();

        this.events = guiEvents;
    }
};
