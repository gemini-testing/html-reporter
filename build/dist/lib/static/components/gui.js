"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var react_redux_1 = require("react-redux");
var actions_1 = require("../modules/actions");
var gui_controls_1 = tslib_1.__importDefault(require("./controls/gui-controls"));
var skipped_list_1 = tslib_1.__importDefault(require("./skipped-list"));
var suites_1 = tslib_1.__importDefault(require("./suites"));
var Gui = /** @class */ (function (_super) {
    tslib_1.__extends(Gui, _super);
    function Gui() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Gui.prototype.componentDidMount = function () {
        this.props.gui && this.props.initial();
    };
    Gui.prototype.render = function () {
        return (react_1.default.createElement(react_1.Fragment, null,
            react_1.default.createElement(gui_controls_1.default, null),
            react_1.default.createElement(skipped_list_1.default, null),
            react_1.default.createElement(suites_1.default, null)));
    };
    return Gui;
}(react_1.Component));
exports.default = react_redux_1.connect(function (_a) {
    var gui = _a.gui;
    return ({ gui: gui });
}, { initial: actions_1.initial })(Gui);
//# sourceMappingURL=gui.js.map