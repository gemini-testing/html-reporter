"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var redux_1 = require("redux");
var react_redux_1 = require("react-redux");
var actions = tslib_1.__importStar(require("../../modules/actions"));
var button_1 = tslib_1.__importDefault(require("./button"));
var view_select_1 = tslib_1.__importDefault(require("./view-select"));
var base_host_1 = tslib_1.__importDefault(require("./base-host"));
var ControlButtons = /** @class */ (function (_super) {
    tslib_1.__extends(ControlButtons, _super);
    function ControlButtons() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ControlButtons.prototype.render = function () {
        var _a = this.props, view = _a.view, actions = _a.actions;
        return (react_1.default.createElement(react_1.Fragment, null,
            react_1.default.createElement(view_select_1.default, { options: [
                    { value: 'all', text: 'Show all' },
                    { value: 'failed', text: 'Show only failed' }
                ] }),
            react_1.default.createElement("div", { className: 'control-group' },
                react_1.default.createElement(button_1.default, { label: 'Expand all', isControlGroup: true, isActive: view.expand === 'all', handler: actions.expandAll }),
                react_1.default.createElement(button_1.default, { label: 'Collapse all', isControlGroup: true, isActive: view.expand === 'none', handler: actions.collapseAll }),
                react_1.default.createElement(button_1.default, { label: 'Expand errors', isControlGroup: true, isActive: view.expand === 'errors', handler: actions.expandErrors }),
                react_1.default.createElement(button_1.default, { label: 'Expand retries', isControlGroup: true, isActive: view.expand === 'retries', handler: actions.expandRetries })),
            react_1.default.createElement(button_1.default, { label: 'Show skipped', isActive: view.showSkipped, handler: actions.toggleSkipped }),
            react_1.default.createElement(button_1.default, { label: 'Show only diff', isActive: view.showOnlyDiff, handler: actions.toggleOnlyDiff }),
            react_1.default.createElement(button_1.default, { label: 'Scale images', isActive: view.scaleImages, handler: actions.toggleScaleImages }),
            react_1.default.createElement(button_1.default, { label: 'Lazy image load', isActive: Boolean(view.lazyLoadOffset), handler: actions.toggleLazyLoad }),
            react_1.default.createElement(base_host_1.default, null)));
    };
    return ControlButtons;
}(react_1.Component));
exports.default = react_redux_1.connect(function (state) { return ({ view: state.view }); }, function (dispatch) { return ({ actions: redux_1.bindActionCreators(actions, dispatch) }); })(ControlButtons);
//# sourceMappingURL=common-controls.js.map