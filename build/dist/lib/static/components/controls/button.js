'use strict';
import * as tslib_1 from "tslib";
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Button } from 'semantic-ui-react';
var ControlButton = /** @class */ (function (_super) {
    tslib_1.__extends(ControlButton, _super);
    function ControlButton() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ControlButton.prototype.render = function () {
        var _a = this.props, label = _a.label, handler = _a.handler, isActive = _a.isActive, isAction = _a.isAction, isSuiteControl = _a.isSuiteControl, isControlGroup = _a.isControlGroup, _b = _a.isDisabled, isDisabled = _b === void 0 ? false : _b;
        var className = classNames('button', { 'button_type_suite-controls': isSuiteControl }, { 'button_checked': isActive }, { 'button_type_action': isAction }, { 'control-group__item': isControlGroup });
        return (React.createElement(Button, { onClick: handler, className: className, disabled: isDisabled }, label));
    };
    ControlButton.propTypes = {
        label: PropTypes.string.isRequired,
        handler: PropTypes.func.isRequired,
        isActive: PropTypes.bool,
        isAction: PropTypes.bool,
        isDisabled: PropTypes.bool,
        isSuiteControl: PropTypes.bool,
        isControlGroup: PropTypes.bool
    };
    return ControlButton;
}(Component));
export default ControlButton;
//# sourceMappingURL=button.js.map