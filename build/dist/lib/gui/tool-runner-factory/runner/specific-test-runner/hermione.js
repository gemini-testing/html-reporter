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
var mkFullTitle = require('../../hermione/utils').mkFullTitle;
module.exports = /** @class */ (function (_super) {
    __extends(HermioneSpecificTestRunner, _super);
    function HermioneSpecificTestRunner() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    HermioneSpecificTestRunner.prototype._filter = function () {
        var _this = this;
        this._collection.disableAll();
        this._tests.forEach(function (test) {
            _this._collection.enableTest(mkFullTitle(test), test.browserId);
        });
    };
    return HermioneSpecificTestRunner;
}(SpecificTestRunner));
//# sourceMappingURL=hermione.js.map