'use strict';
import * as tslib_1 from "tslib";
import React, { Fragment } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import SectionBase from './section-base';
import BrowserTitle from './title/browser';
import BrowserSkippedTitle from './title/browser-skipped';
import Body from './body';
import { isFailStatus, isErroredStatus, isSkippedStatus } from '../../../common-utils';
var SectionBrowser = /** @class */ (function (_super) {
    tslib_1.__extends(SectionBrowser, _super);
    function SectionBrowser() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SectionBrowser.prototype.render = function () {
        var _a = this.props.browser, name = _a.name, result = _a.result, retries = _a.retries, status = _a.result.status;
        var body = this.state.collapsed
            ? null
            : React.createElement(Body, { result: result, suite: this.props.suite, retries: retries });
        var section = this.state.skipped
            ? React.createElement(BrowserSkippedTitle, { result: result })
            : (React.createElement(Fragment, null,
                React.createElement(BrowserTitle, { name: name, result: result, handler: this._toggleState }),
                body));
        return (React.createElement("div", { className: this._resolveSectionStatus(status) }, section));
    };
    SectionBrowser.prototype._getStateFromProps = function () {
        var _a = this.props, expand = _a.expand, browser = _a.browser;
        var status = browser.result.status, _b = browser.retries, retries = _b === void 0 ? [] : _b;
        var failed = isErroredStatus(status) || isFailStatus(status);
        var retried = retries.length > 0;
        var skipped = isSkippedStatus(status);
        return { failed: failed, retried: retried, skipped: skipped, expand: expand };
    };
    SectionBrowser.propTypes = tslib_1.__assign({ browser: PropTypes.shape({
            name: PropTypes.string.isRequired,
            result: PropTypes.object.isRequired,
            retries: PropTypes.array
        }), suite: PropTypes.object }, SectionBase.propTypes);
    return SectionBrowser;
}(SectionBase));
export { SectionBrowser };
export default connect(function (_a) {
    var expand = _a.view.expand;
    return ({ expand: expand });
})(SectionBrowser);
//# sourceMappingURL=section-browser.js.map