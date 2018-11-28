'use strict';
import * as tslib_1 from "tslib";
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
var ToggleOpen = /** @class */ (function (_super) {
    tslib_1.__extends(ToggleOpen, _super);
    function ToggleOpen() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.state = {
            isCollapsed: true
        };
        _this.toggleHandler = function (event) {
            event.preventDefault();
            _this.setState({
                isCollapsed: !_this.state.isCollapsed
            });
        };
        return _this;
    }
    ToggleOpen.prototype.render = function () {
        var _a = this.props, title = _a.title, content = _a.content;
        var className = classNames('toggle-open', { 'toggle-open_collapsed': this.state.isCollapsed });
        return (React.createElement("div", { className: className },
            React.createElement("div", { onClick: this.toggleHandler, className: "toggle-open__switcher" }, title),
            React.createElement("div", { className: "toggle-open__content" }, content)));
    };
    ToggleOpen.propTypes = {
        title: PropTypes.string.isRequired,
        content: PropTypes.oneOfType([PropTypes.element, PropTypes.array])
    };
    return ToggleOpen;
}(Component));
export default ToggleOpen;
//# sourceMappingURL=toggle-open.js.map