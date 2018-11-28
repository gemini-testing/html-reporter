'use strict';
import * as tslib_1 from "tslib";
import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Screenshot from './screenshot';
var StateFail = /** @class */ (function (_super) {
    tslib_1.__extends(StateFail, _super);
    function StateFail() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    StateFail.prototype.render = function () {
        var _a = this.props, expected = _a.expected, actual = _a.actual, diff = _a.diff;
        return (React.createElement(Fragment, null,
            this._drawExpectedAndActual(expected, actual),
            this._drawImageBox('Diff', diff)));
    };
    StateFail.prototype._drawExpectedAndActual = function (expected, actual) {
        if (this.props.showOnlyDiff) {
            return null;
        }
        return (React.createElement(Fragment, null,
            this._drawImageBox('Expected', expected),
            this._drawImageBox('Actual', actual)));
    };
    StateFail.prototype._drawImageBox = function (label, path) {
        return (React.createElement("div", { className: "image-box__image" },
            React.createElement("div", { className: "image-box__title" }, label),
            React.createElement(Screenshot, { imagePath: path })));
    };
    StateFail.propTypes = {
        expected: PropTypes.string.isRequired,
        actual: PropTypes.string.isRequired,
        diff: PropTypes.string.isRequired,
        showOnlyDiff: PropTypes.bool.isRequired
    };
    return StateFail;
}(Component));
export default connect(function (_a) {
    var showOnlyDiff = _a.view.showOnlyDiff;
    return ({ showOnlyDiff: showOnlyDiff });
})(StateFail);
//# sourceMappingURL=state-fail.js.map