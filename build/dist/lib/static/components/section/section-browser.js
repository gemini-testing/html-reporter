'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var react_redux_1 = require("react-redux");
var section_base_1 = require("./section-base");
var browser_1 = tslib_1.__importDefault(require("./title/browser"));
var browser_skipped_1 = tslib_1.__importDefault(require("./title/browser-skipped"));
var body_1 = tslib_1.__importDefault(require("./body"));
var common_utils_1 = require("../../../common-utils");
var SectionBrowser = /** @class */ (function (_super) {
    tslib_1.__extends(SectionBrowser, _super);
    function SectionBrowser(props) {
        return _super.call(this, props) || this;
    }
    SectionBrowser.prototype.render = function () {
        var _a = this.props.browser, name = _a.name, result = _a.result, retries = _a.retries, status = _a.result.status;
        var body = this.state.collapsed
            ? null
            : react_1.default.createElement(body_1.default, { result: result, suite: this.props.suite, retries: retries });
        var section = this.state.skipped
            ? react_1.default.createElement(browser_skipped_1.default, { result: result })
            : (react_1.default.createElement(react_1.Fragment, null,
                react_1.default.createElement(browser_1.default, { name: name, result: result, handler: this._toggleState }),
                body));
        return (react_1.default.createElement("div", { className: this._resolveSectionStatus(status) }, section));
    };
    SectionBrowser.prototype._getStateFromProps = function () {
        var _a = this.props, expand = _a.expand, browser = _a.browser;
        var status = browser.result.status, _b = browser.retries, retries = _b === void 0 ? [] : _b;
        var failed = common_utils_1.isErroredStatus(status) || common_utils_1.isFailStatus(status);
        var retried = retries.length > 0;
        var skipped = common_utils_1.isSkippedStatus(status);
        return { failed: failed, retried: retried, skipped: skipped, expand: expand };
    };
    return SectionBrowser;
}(section_base_1.Base));
exports.SectionBrowser = SectionBrowser;
exports.default = react_redux_1.connect(function (_a) {
    var expand = _a.view.expand;
    return ({ expand: expand });
})(SectionBrowser);
//# sourceMappingURL=section-browser.js.map