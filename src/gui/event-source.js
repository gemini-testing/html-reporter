'use strict';

const stringify = require('json-stringify-safe');

module.exports = class EventSource {
    constructor() {
        this._connections = [];
    }

    addConnection(connection) {
        this._connections.push(connection);
    }

    emit(event, data) {
        this._connections.forEach(function(connection) {
            connection.write('event: ' + event + '\n');
            connection.write('data: ' + stringify(data) + '\n');
            connection.write('\n\n');
        });
    }
};
