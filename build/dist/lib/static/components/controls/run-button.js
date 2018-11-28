'use strict';
import * as tslib_1 from "tslib";
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ControlButton from './button';
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
        return (React.createElement(ControlButton, { label: "Run", isAction: true, handler: handler, isDisabled: isDisabled }));
    };
    RunButton.propTypes = {
        handler: PropTypes.func.isRequired,
        autoRun: PropTypes.bool.isRequired,
        isDisabled: PropTypes.bool
    };
    return RunButton;
}(Component));
export default RunButton;
//# sourceMappingURL=run-button.js.map