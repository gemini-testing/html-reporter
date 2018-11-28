'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var EventEmitter = require('events').EventEmitter;
var guiEvents = require('../constants/gui-events');
module.exports = /** @class */ (function (_super) {
    __extends(ApiFacade, _super);
    function ApiFacade() {
        var _this = _super.call(this) || this;
        _this.events = guiEvents;
        return _this;
    }
    ApiFacade.create = function () {
        return new ApiFacade();
    };
    return ApiFacade;
}(EventEmitter));
//# sourceMappingURL=facade.js.map