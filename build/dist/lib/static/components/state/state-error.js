'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var prop_types_1 = tslib_1.__importDefault(require("prop-types"));
var lodash_1 = require("lodash");
var screenshot_1 = tslib_1.__importDefault(require("./screenshot"));
var StateError = /** @class */ (function (_super) {
    tslib_1.__extends(StateError, _super);
    function StateError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    StateError.prototype.render = function () {
        var _a = this.props, image = _a.image, reason = _a.reason, actual = _a.actual;
        return (react_1.default.createElement("div", { className: "image-box__image" },
            react_1.default.createElement("div", { className: "reason" }, reasonToElements(reason)),
            this._drawImage(image, actual)));
    };
    StateError.prototype._drawImage = function (image, actual) {
        return image ? react_1.default.createElement(screenshot_1.default, { imagePath: actual }) : null;
    };
    StateError.propTypes = {
        image: prop_types_1.default.bool.isRequired,
        reason: prop_types_1.default.object.isRequired,
        actual: prop_types_1.default.string
    };
    return StateError;
}(react_1.Component));
exports.default = StateError;
function reasonToElements(reason) {
    return lodash_1.map(reason, function (value, key) {
        return (react_1.default.createElement("div", { key: key, className: "reason__item" },
            react_1.default.createElement("span", { className: "reason__item-key" }, key),
            ": ",
            value));
    });
}
//# sourceMappingURL=state-error.js.map