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
var SpecificTestRunner = require('./');
module.exports = /** @class */ (function (_super) {
    __extends(GeminiSpecificTestRunner, _super);
    function GeminiSpecificTestRunner() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    GeminiSpecificTestRunner.prototype._filter = function () {
        var _this = this;
        this._collection.disableAll();
        this._tests.forEach(function (_a) {
            var suite = _a.suite, state = _a.state, browserId = _a.browserId;
            var suiteName = suite.path.join(' ');
            _this._collection.enable(suiteName, { state: state.name, browser: browserId });
        });
    };
    return GeminiSpecificTestRunner;
}(SpecificTestRunner));
//# sourceMappingURL=gemini.js.map