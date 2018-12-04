'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var redux_1 = require("redux");
var react_redux_1 = require("react-redux");
var lodash_1 = require("lodash");
var actions = tslib_1.__importStar(require("../../modules/actions"));
var common_controls_1 = tslib_1.__importDefault(require("./common-controls"));
var button_1 = tslib_1.__importDefault(require("./button"));
var run_button_1 = tslib_1.__importDefault(require("./run-button"));
var ControlButtons = /** @class */ (function (_super) {
    tslib_1.__extends(ControlButtons, _super);
    function ControlButtons() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this._runFailedTests = function () {
            var _a = _this.props, actions = _a.actions, failed = _a.failed;
            return actions.runFailedTests(failed);
        };
        _this._acceptAll = function () {
            var _a = _this.props, actions = _a.actions, failed = _a.failed;
            return actions.acceptAll(failed);
        };
        return _this;
    }
    ControlButtons.prototype.render = function () {
        var _a = this.props, actions = _a.actions, suiteIds = _a.suiteIds, failed = _a.failed, running = _a.running, autoRun = _a.autoRun;
        return (react_1.default.createElement("div", { className: 'control-buttons' },
            react_1.default.createElement(run_button_1.default, { autoRun: autoRun, isDisabled: !suiteIds.all.length || running, handler: actions.runAllTests }),
            react_1.default.createElement(button_1.default, { label: 'Retry failed tests', isDisabled: running || !failed.length, handler: this._runFailedTests }),
            react_1.default.createElement(button_1.default, { label: 'Accept all', isDisabled: running || !failed.length, handler: this._acceptAll }),
            react_1.default.createElement(common_controls_1.default, null)));
    };
    return ControlButtons;
}(react_1.Component));
exports.default = react_redux_1.connect(function (state) { return ({
    suiteIds: state.suiteIds,
    running: state.running,
    autoRun: state.autoRun,
    failed: lodash_1.values(lodash_1.pick(state.suites, state.suiteIds.failed))
}); }, function (dispatch) { return ({ actions: redux_1.bindActionCreators(actions, dispatch) }); })(ControlButtons);
//# sourceMappingURL=gui-controls.js.map