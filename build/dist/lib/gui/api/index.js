'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var ApiFacade = require('./facade');
module.exports = /** @class */ (function () {
    function Api(tool) {
        this._gui = tool.gui = ApiFacade.create();
    }
    Api.create = function (tool) {
        return new Api(tool);
    };
    Api.prototype.initServer = function (server) {
        this._gui.emit(this._gui.events.SERVER_INIT, server);
    };
    return Api;
}());
//# sourceMappingURL=index.js.map