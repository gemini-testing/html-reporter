'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importDefault(require("react"));
var react_redux_1 = require("react-redux");
var lodash_1 = require("lodash");
var section_base_1 = require("./section-base");
var section_browser_1 = tslib_1.__importDefault(require("./section-browser"));
var utils_1 = require("../../modules/utils");
var simple_1 = tslib_1.__importDefault(require("./title/simple"));
var SectionCommon = /** @class */ (function (_super) {
    tslib_1.__extends(SectionCommon, _super);
    function SectionCommon(props) {
        return _super.call(this, props) || this;
    }
    SectionCommon.prototype.render = function () {
        var _a = this.props, suite = _a.suite, expand = _a.expand;
        if (!suite)
            return null;
        var name = suite.name, _b = suite.browsers, browsers = _b === void 0 ? [] : _b, _c = suite.children, children = _c === void 0 ? [] : _c, status = suite.status;
        if (this.state.collapsed) {
            return (react_1.default.createElement("div", { className: this._resolveSectionStatus(status) },
                react_1.default.createElement(simple_1.default, { name: name, suite: suite, handler: this._toggleState })));
        }
        var childrenTmpl = children.map(function (child) {
            var key = lodash_1.uniqueId(suite.suitePath + "-" + suite.name);
            return react_1.default.createElement(SectionCommon, { key: key, suite: child, expand: expand });
        });
        var browserTmpl = browsers.map(function (browser) {
            return react_1.default.createElement(section_browser_1.default, { key: browser.name, browser: browser, suite: suite });
        });
        return (react_1.default.createElement("div", { className: this._resolveSectionStatus(status) },
            react_1.default.createElement(simple_1.default, { name: name, suite: suite, handler: this._toggleState }),
            react_1.default.createElement("div", { className: 'section__body section__body_guided' },
                browserTmpl,
                childrenTmpl)));
    };
    SectionCommon.prototype._getStateFromProps = function () {
        var _a = this.props, suite = _a.suite, expand = _a.expand;
        return {
            failed: utils_1.hasFails(suite),
            retried: utils_1.hasRetries(suite),
            skipped: utils_1.allSkipped(suite),
            expand: expand
        };
    };
    return SectionCommon;
}(section_base_1.Base));
exports.SectionCommon = SectionCommon;
exports.default = react_redux_1.connect(function (_a, ownProps) {
    var _b = _a.view, expand = _b.expand, viewMode = _b.viewMode, suites = _a.suites;
    return {
        expand: expand,
        viewMode: viewMode,
        suite: suites[ownProps.suiteId]
    };
})(SectionCommon);
//# sourceMappingURL=section-common.js.map