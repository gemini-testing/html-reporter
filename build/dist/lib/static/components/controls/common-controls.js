'use strict';
import * as tslib_1 from "tslib";
import React, { Component, Fragment } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as actions from '../../modules/actions';
import ControlButton from './button';
import ViewSelect from './view-select';
import BaseHostInput from './base-host';
var ControlButtons = /** @class */ (function (_super) {
    tslib_1.__extends(ControlButtons, _super);
    function ControlButtons() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ControlButtons.prototype.render = function () {
        var _a = this.props, view = _a.view, actions = _a.actions;
        return (React.createElement(Fragment, null,
            React.createElement(ViewSelect, { options: [
                    { value: 'all', text: 'Show all' },
                    { value: 'failed', text: 'Show only failed' }
                ] }),
            React.createElement("div", { className: "control-group" },
                React.createElement(ControlButton, { label: "Expand all", isControlGroup: true, isActive: view.expand === 'all', handler: actions.expandAll }),
                React.createElement(ControlButton, { label: "Collapse all", isControlGroup: true, isActive: view.expand === 'none', handler: actions.collapseAll }),
                React.createElement(ControlButton, { label: "Expand errors", isControlGroup: true, isActive: view.expand === 'errors', handler: actions.expandErrors }),
                React.createElement(ControlButton, { label: "Expand retries", isControlGroup: true, isActive: view.expand === 'retries', handler: actions.expandRetries })),
            React.createElement(ControlButton, { label: "Show skipped", isActive: view.showSkipped, handler: actions.toggleSkipped }),
            React.createElement(ControlButton, { label: "Show only diff", isActive: view.showOnlyDiff, handler: actions.toggleOnlyDiff }),
            React.createElement(ControlButton, { label: "Scale images", isActive: view.scaleImages, handler: actions.toggleScaleImages }),
            React.createElement(ControlButton, { label: "Lazy image load", isActive: Boolean(view.lazyLoadOffset), handler: actions.toggleLazyLoad }),
            React.createElement(BaseHostInput, null)));
    };
    return ControlButtons;
}(Component));
export default connect(function (state) { return ({ view: state.view }); }, function (dispatch) { return ({ actions: bindActionCreators(actions, dispatch) }); })(ControlButtons);
//# sourceMappingURL=common-controls.js.map