'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var react_redux_1 = require("react-redux");
var prop_types_1 = tslib_1.__importDefault(require("prop-types"));
var screenshot_1 = tslib_1.__importDefault(require("./screenshot"));
var StateFail = /** @class */ (function (_super) {
    tslib_1.__extends(StateFail, _super);
    function StateFail() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    StateFail.prototype.render = function () {
        var _a = this.props, expected = _a.expected, actual = _a.actual, diff = _a.diff;
        return (react_1.default.createElement(react_1.Fragment, null,
            this._drawExpectedAndActual(expected, actual),
            this._drawImageBox('Diff', diff)));
    };
    StateFail.prototype._drawExpectedAndActual = function (expected, actual) {
        if (this.props.showOnlyDiff) {
            return null;
        }
        return (react_1.default.createElement(react_1.Fragment, null,
            this._drawImageBox('Expected', expected),
            this._drawImageBox('Actual', actual)));
    };
    StateFail.prototype._drawImageBox = function (label, path) {
        return (react_1.default.createElement("div", { className: "image-box__image" },
            react_1.default.createElement("div", { className: "image-box__title" }, label),
            react_1.default.createElement(screenshot_1.default, { imagePath: path })));
    };
    StateFail.propTypes = {
        expected: prop_types_1.default.string.isRequired,
        actual: prop_types_1.default.string.isRequired,
        diff: prop_types_1.default.string.isRequired,
        showOnlyDiff: prop_types_1.default.bool.isRequired
    };
    return StateFail;
}(react_1.Component));
exports.default = react_redux_1.connect(function (_a) {
    var showOnlyDiff = _a.view.showOnlyDiff;
    return ({ showOnlyDiff: showOnlyDiff });
})(StateFail);
//# sourceMappingURL=state-fail.js.map