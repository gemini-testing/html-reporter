'use strict';
import * as tslib_1 from "tslib";
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
var SwitcherStyle = /** @class */ (function (_super) {
    tslib_1.__extends(SwitcherStyle, _super);
    function SwitcherStyle(props) {
        var _this = _super.call(this, props) || this;
        _this.state = { color: 1 };
        return _this;
    }
    SwitcherStyle.prototype.render = function () {
        return (React.createElement("div", { className: "cswitcher" },
            this._drawButton(1),
            this._drawButton(2),
            this._drawButton(3)));
    };
    SwitcherStyle.prototype._drawButton = function (index) {
        var _this = this;
        var className = classNames('state-button', 'cswitcher__item', "cswitcher_color_" + index, { 'cswitcher__item_selected': index === this.state.color });
        return (React.createElement("button", { className: className, onClick: function () { return _this._onChange(index); } }, "\u00A0"));
    };
    SwitcherStyle.prototype._onChange = function (index) {
        this.setState({ color: index });
        this.props.onChange(index);
    };
    SwitcherStyle.propTypes = {
        onChange: PropTypes.func.isRequired
    };
    return SwitcherStyle;
}(Component));
export default SwitcherStyle;
//# sourceMappingURL=switcher-style.js.map