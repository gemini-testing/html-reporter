"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var button_1 = tslib_1.__importDefault(require("./button"));
var RunButton = /** @class */ (function (_super) {
    tslib_1.__extends(RunButton, _super);
    function RunButton() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    RunButton.prototype.componentWillReceiveProps = function (_a) {
        var autoRun = _a.autoRun;
        if (this.props.autoRun !== autoRun && autoRun) {
            this.props.handler();
        }
    };
    RunButton.prototype.render = function () {
        var _a = this.props, handler = _a.handler, isDisabled = _a.isDisabled;
        return (react_1.default.createElement(button_1.default, { label: 'Run', isAction: true, handler: handler, isDisabled: isDisabled }));
    };
    return RunButton;
}(react_1.Component));
exports.default = RunButton;
//# sourceMappingURL=run-button.js.map