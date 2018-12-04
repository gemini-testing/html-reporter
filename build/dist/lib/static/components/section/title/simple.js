'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var react_redux_1 = require("react-redux");
var actions_1 = require("../../../modules/actions");
var CopyToClipboard = require('react-copy-to-clipboard');
var SectionTitle = /** @class */ (function (_super) {
    tslib_1.__extends(SectionTitle, _super);
    function SectionTitle(props) {
        var _this = _super.call(this, props) || this;
        _this.onSuiteRetry.bind(_this);
        _this._drawCopyButton.bind(_this);
        _this._drawRetryButton.bind(_this);
        return _this;
    }
    SectionTitle.prototype.onSuiteRetry = function (e) {
        e.stopPropagation();
        this.props.retrySuite(this.props.suite);
    };
    SectionTitle.prototype.render = function () {
        var _a = this.props, name = _a.name, handler = _a.handler, gui = _a.gui;
        return (react_1.default.createElement("div", { className: 'section__title', onClick: handler },
            name,
            this._drawCopyButton(),
            gui && this._drawRetryButton()));
    };
    SectionTitle.prototype._drawCopyButton = function () {
        return (react_1.default.createElement(CopyToClipboard, { className: 'button section__icon section__icon_copy-to-clipboard', text: this.props.suite.suitePath.join(' '), onCopy: function (e) { return e.stopPropagation(); } },
            react_1.default.createElement("button", null)));
    };
    SectionTitle.prototype._drawRetryButton = function () {
        return (react_1.default.createElement("button", { className: 'button section__icon section__icon_retry', title: 'retry suite', onClick: this.onSuiteRetry }));
    };
    return SectionTitle;
}(react_1.Component));
exports.default = react_redux_1.connect(function (_a) {
    var gui = _a.gui;
    return ({ gui: gui });
}, { retrySuite: actions_1.retrySuite })(SectionTitle);
//# sourceMappingURL=simple.js.map