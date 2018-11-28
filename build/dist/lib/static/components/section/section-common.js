'use strict';
import * as tslib_1 from "tslib";
import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { uniqueId } from 'lodash';
import SectionBase from './section-base';
import SectionBrowser from './section-browser';
import { allSkipped, hasFails, hasRetries } from '../../modules/utils';
import Title from './title/simple';
var SectionCommon = /** @class */ (function (_super) {
    tslib_1.__extends(SectionCommon, _super);
    function SectionCommon() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SectionCommon.prototype.render = function () {
        var _a = this.props, suite = _a.suite, expand = _a.expand;
        var name = suite.name, _b = suite.browsers, browsers = _b === void 0 ? [] : _b, _c = suite.children, children = _c === void 0 ? [] : _c, status = suite.status;
        if (this.state.collapsed) {
            return (React.createElement("div", { className: this._resolveSectionStatus(status) },
                React.createElement(Title, { name: name, suite: suite, handler: this._toggleState })));
        }
        var childrenTmpl = children.map(function (child) {
            var key = uniqueId(suite.suitePath + "-" + suite.name);
            return React.createElement(SectionCommon, { key: key, suite: child, expand: expand });
        });
        var browserTmpl = browsers.map(function (browser) {
            return React.createElement(SectionBrowser, { key: browser.name, browser: browser, suite: suite });
        });
        return (React.createElement("div", { className: this._resolveSectionStatus(status) },
            React.createElement(Title, { name: name, suite: suite, handler: this._toggleState }),
            React.createElement("div", { className: "section__body section__body_guided" },
                browserTmpl,
                childrenTmpl)));
    };
    SectionCommon.prototype._getStateFromProps = function () {
        var _a = this.props, suite = _a.suite, expand = _a.expand;
        return {
            failed: hasFails(suite),
            retried: hasRetries(suite),
            skipped: allSkipped(suite),
            expand: expand
        };
    };
    SectionCommon.propTypes = tslib_1.__assign({ suiteId: PropTypes.string, suite: PropTypes.shape({
            name: PropTypes.string,
            suitePath: PropTypes.array,
            browsers: PropTypes.array,
            children: PropTypes.array
        }) }, SectionBase.propTypes);
    return SectionCommon;
}(SectionBase));
export { SectionCommon };
export default connect(function (_a, ownProps) {
    var _b = _a.view, expand = _b.expand, viewMode = _b.viewMode, suites = _a.suites;
    return {
        expand: expand,
        viewMode: viewMode,
        suite: suites[ownProps.suiteId]
    };
})(SectionCommon);
//# sourceMappingURL=section-common.js.map