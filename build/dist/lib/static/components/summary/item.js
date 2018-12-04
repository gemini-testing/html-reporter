'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var classnames_1 = tslib_1.__importDefault(require("classnames"));
var SummaryItem = /** @class */ (function (_super) {
    tslib_1.__extends(SummaryItem, _super);
    function SummaryItem() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SummaryItem.prototype.render = function () {
        var _a = this.props, label = _a.label, value = _a.value, _b = _a.isFailed, isFailed = _b === void 0 ? false : _b;
        if (isFailed && value === 0) {
            return null;
        }
        var className = classnames_1.default('summary__key', { 'summary__key_has-fails': isFailed });
        return (react_1.default.createElement(react_1.Fragment, null,
            react_1.default.createElement("dt", { className: className }, label),
            react_1.default.createElement("dd", { className: 'summary__value' }, value)));
    };
    return SummaryItem;
}(react_1.Component));
exports.default = SummaryItem;
//# sourceMappingURL=item.js.map