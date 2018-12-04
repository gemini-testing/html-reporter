'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var classnames_1 = tslib_1.__importDefault(require("classnames"));
var semantic_ui_react_1 = require("semantic-ui-react");
var ControlButton = /** @class */ (function (_super) {
    tslib_1.__extends(ControlButton, _super);
    function ControlButton() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ControlButton.prototype.render = function () {
        var _a = this.props, label = _a.label, handler = _a.handler, isSuiteControl = _a.isSuiteControl, isControlGroup = _a.isControlGroup, _b = _a.isDisabled, isDisabled = _b === void 0 ? false : _b;
        var className = classnames_1.default('button', { 'button_type_suite-controls': isSuiteControl }, { 'control-group__item': isControlGroup });
        return (react_1.default.createElement(semantic_ui_react_1.Button, { onClick: handler, className: className, disabled: isDisabled }, label));
    };
    return ControlButton;
}(react_1.Component));
exports.default = ControlButton;
//# sourceMappingURL=button.js.map