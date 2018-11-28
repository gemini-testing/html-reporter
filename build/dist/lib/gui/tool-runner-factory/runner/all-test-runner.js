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
var Runner = require('./runner');
module.exports = /** @class */ (function (_super) {
    __extends(AllRunner, _super);
    function AllRunner() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    AllRunner.prototype.run = function (runHandler) {
        this._collection.enableAll();
        return _super.prototype.run.call(this, runHandler);
    };
    return AllRunner;
}(Runner));
//# sourceMappingURL=all-test-runner.js.map