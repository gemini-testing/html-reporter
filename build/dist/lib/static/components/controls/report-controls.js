"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var redux_1 = require("redux");
var react_redux_1 = require("react-redux");
var actions = tslib_1.__importStar(require("../../modules/actions"));
var common_controls_1 = tslib_1.__importDefault(require("./common-controls"));
var ControlButtons = /** @class */ (function (_super) {
    tslib_1.__extends(ControlButtons, _super);
    function ControlButtons() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ControlButtons.prototype.render = function () {
        return (react_1.default.createElement("div", { className: 'control-buttons' },
            react_1.default.createElement(common_controls_1.default, null)));
    };
    return ControlButtons;
}(react_1.Component));
exports.default = react_redux_1.connect(function (state) { return ({ view: state.view }); }, function (dispatch) { return ({ actions: redux_1.bindActionCreators(actions, dispatch) }); })(ControlButtons);
//# sourceMappingURL=report-controls.js.map