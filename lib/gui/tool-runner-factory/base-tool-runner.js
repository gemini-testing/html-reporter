'use strict';

const temp = require('temp');
const EventSource = require('../event-source');

temp.track();

module.exports = class ToolRunner {
    constructor(paths) {
        this._testFiles = [].concat(paths);
        this._eventSource = new EventSource();
        this.diffDir = temp.path('gemini-gui-diff');
        this.currentDir = temp.path('gemini-gui-curr');
    }

    addClient(connection) {
        this._eventSource.addConnection(connection);
    }

    sendClientEvent(event, data) {
        this._eventSource.emit(event, data);
    }

    getTests() {
        return this.tests;
    }
};
