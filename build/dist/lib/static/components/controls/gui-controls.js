'use strict';
import * as tslib_1 from "tslib";
import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { pick, values } from 'lodash';
import PropTypes from 'prop-types';
import * as actions from '../../modules/actions';
import CommonControls from './common-controls';
import ControlButton from './button';
import RunButton from './run-button';
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
        return (React.createElement("div", { className: "control-buttons" },
            React.createElement(RunButton, { autoRun: autoRun, isDisabled: !suiteIds.all.length || running, handler: actions.runAllTests }),
            React.createElement(ControlButton, { label: "Retry failed tests", isDisabled: running || !failed.length, handler: this._runFailedTests }),
            React.createElement(ControlButton, { label: "Accept all", isDisabled: running || !failed.length, handler: this._acceptAll }),
            React.createElement(CommonControls, null)));
    };
    ControlButtons.propTypes = {
        suiteIds: PropTypes.object,
        running: PropTypes.bool,
        autoRun: PropTypes.bool,
        failed: PropTypes.array
    };
    return ControlButtons;
}(Component));
export default connect(function (state) { return ({
    suiteIds: state.suiteIds,
    running: state.running,
    autoRun: state.autoRun,
    failed: values(pick(state.suites, state.suiteIds.failed))
}); }, function (dispatch) { return ({ actions: bindActionCreators(actions, dispatch) }); })(ControlButtons);
//# sourceMappingURL=gui-controls.js.map