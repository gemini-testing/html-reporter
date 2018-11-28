'use strict';
import * as tslib_1 from "tslib";
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { map } from 'lodash';
import Screenshot from './screenshot';
var StateError = /** @class */ (function (_super) {
    tslib_1.__extends(StateError, _super);
    function StateError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    StateError.prototype.render = function () {
        var _a = this.props, image = _a.image, reason = _a.reason, actual = _a.actual;
        return (React.createElement("div", { className: "image-box__image" },
            React.createElement("div", { className: "reason" }, reasonToElements(reason)),
            this._drawImage(image, actual)));
    };
    StateError.prototype._drawImage = function (image, actual) {
        return image ? React.createElement(Screenshot, { imagePath: actual }) : null;
    };
    StateError.propTypes = {
        image: PropTypes.bool.isRequired,
        reason: PropTypes.object.isRequired,
        actual: PropTypes.string
    };
    return StateError;
}(Component));
export default StateError;
function reasonToElements(reason) {
    return map(reason, function (value, key) {
        return (React.createElement("div", { key: key, className: "reason__item" },
            React.createElement("span", { className: "reason__item-key" }, key),
            ": ",
            value));
    });
}
//# sourceMappingURL=state-error.js.map