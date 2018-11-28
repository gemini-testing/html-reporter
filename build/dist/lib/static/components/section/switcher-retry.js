'use strict';
import * as tslib_1 from "tslib";
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
var SwitcherRetry = /** @class */ (function (_super) {
    tslib_1.__extends(SwitcherRetry, _super);
    function SwitcherRetry(props) {
        var _this = _super.call(this, props) || this;
        _this.state = { retry: _this.props.retries.length };
        return _this;
    }
    SwitcherRetry.prototype.render = function () {
        var _this = this;
        var retries = this.props.retries;
        if (retries.length === 0) {
            return null;
        }
        var buttonsTmpl = [];
        var _loop_1 = function (i) {
            var className = classNames('state-button', 'tab-switcher__button', { 'tab-switcher__button_active': i === this_1.state.retry });
            buttonsTmpl.push(React.createElement("button", { key: i, className: className, onClick: function () { return _this._onChange(i); } }, i + 1));
        };
        var this_1 = this;
        for (var i = 0; i <= retries.length; i++) {
            _loop_1(i);
        }
        return (React.createElement("div", { className: "tab-switcher" }, buttonsTmpl));
    };
    SwitcherRetry.prototype._onChange = function (index) {
        this.setState({ retry: index });
        this.props.onChange(index);
    };
    SwitcherRetry.propTypes = {
        retries: PropTypes.array,
        onChange: PropTypes.func.isRequired
    };
    SwitcherRetry.defaultProps = {
        retries: []
    };
    return SwitcherRetry;
}(Component));
export default SwitcherRetry;
//# sourceMappingURL=switcher-retry.js.map