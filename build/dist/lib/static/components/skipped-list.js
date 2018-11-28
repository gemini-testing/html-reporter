'use strict';
import * as tslib_1 from "tslib";
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Parser from 'html-react-parser';
import classNames from 'classnames';
import { connect } from 'react-redux';
var SkippedList = /** @class */ (function (_super) {
    tslib_1.__extends(SkippedList, _super);
    function SkippedList() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SkippedList.prototype.render = function () {
        var _a = this.props, showSkipped = _a.showSkipped, skips = _a.skips;
        var collapsed = !showSkipped;
        var className = classNames('skipped__list', { collapsed: collapsed });
        var skipsTmpl = skips.length > 0
            ? this._drawSkips(skips)
            : 'There are no skipped tests';
        return (React.createElement("div", { className: className }, skipsTmpl));
    };
    SkippedList.prototype._drawSkips = function (skips) {
        return skips.map(function (skip, index) {
            var browser = skip.browser, comment = skip.comment, suite = skip.suite;
            return (React.createElement("div", { key: index },
                suite,
                " > ",
                browser,
                comment && ' reason: ',
                comment && Parser(comment)));
        });
    };
    SkippedList.propTypes = {
        showSkipped: PropTypes.bool.isRequired,
        skips: PropTypes.array.isRequired
    };
    return SkippedList;
}(Component));
export default connect(function (state) { return ({
    showSkipped: state.view.showSkipped,
    skips: state.skips
}); })(SkippedList);
//# sourceMappingURL=skipped-list.js.map