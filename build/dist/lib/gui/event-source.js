'use strict';
var stringify = require('json-stringify-safe');
module.exports = /** @class */ (function () {
    function EventSource() {
        this._connections = [];
    }
    EventSource.prototype.addConnection = function (connection) {
        this._connections.push(connection);
    };
    EventSource.prototype.emit = function (event, data) {
        this._connections.forEach(function (connection) {
            connection.write('event: ' + event + '\n');
            connection.write('data: ' + stringify(data) + '\n');
            connection.write('\n\n');
        });
    };
    return EventSource;
}());
//# sourceMappingURL=event-source.js.map