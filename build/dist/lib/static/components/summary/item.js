'use strict';
import * as tslib_1 from "tslib";
import React, { Component, Fragment } from 'react';
import classNames from 'classnames';
var SummaryItem = /** @class */ (function (_super) {
    tslib_1.__extends(SummaryItem, _super);
    function SummaryItem() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SummaryItem.prototype.render = function () {
        var _a = this.props, label = _a.label, value = _a.value, _b = _a.isFailed, isFailed = _b === void 0 ? false : _b;
        if (isFailed && value === 0) {
            return null;
        }
        var className = classNames('summary__key', { 'summary__key_has-fails': isFailed });
        return (React.createElement(Fragment, null,
            React.createElement("dt", { className: className }, label),
            React.createElement("dd", { className: "summary__value" }, value)));
    };
    return SummaryItem;
}(Component));
export default SummaryItem;
//# sourceMappingURL=item.js.map