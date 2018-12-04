'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var prop_types_1 = tslib_1.__importDefault(require("prop-types"));
var screenshot_1 = tslib_1.__importDefault(require("./screenshot"));
var common_utils_1 = require("../../../common-utils");
var StateSuccess = /** @class */ (function (_super) {
    tslib_1.__extends(StateSuccess, _super);
    function StateSuccess() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    StateSuccess.prototype.render = function () {
        var _a = this.props, status = _a.status, expected = _a.expected;
        return (react_1.default.createElement("div", { className: "image-box__image" },
            react_1.default.createElement(screenshot_1.default, { noCache: common_utils_1.isUpdatedStatus(status), imagePath: expected })));
    };
    StateSuccess.propTypes = {
        status: prop_types_1.default.string.isRequired,
        expected: prop_types_1.default.string.isRequired
    };
    return StateSuccess;
}(react_1.Component));
exports.default = StateSuccess;
//# sourceMappingURL=state-success.js.map