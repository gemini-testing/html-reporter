'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var url_1 = tslib_1.__importDefault(require("url"));
var react_1 = tslib_1.__importStar(require("react"));
var react_redux_1 = require("react-redux");
var SectionBrowserTitle = /** @class */ (function (_super) {
    tslib_1.__extends(SectionBrowserTitle, _super);
    function SectionBrowserTitle() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SectionBrowserTitle.prototype.render = function () {
        var _a = this.props, name = _a.name, result = _a.result, handler = _a.handler, parsedHost = _a.parsedHost;
        return (react_1.default.createElement("div", { className: 'section__title', onClick: handler },
            name,
            react_1.default.createElement("a", { className: 'button section__icon section__icon_view-local', href: this._buildUrl(result.suiteUrl, parsedHost), onClick: function (e) {
                    return e.stopPropagation();
                }, title: 'view in browser', target: '_blank' })));
    };
    SectionBrowserTitle.prototype._buildUrl = function (href, host) {
        return !host ? href : url_1.default.format(tslib_1.__assign({}, url_1.default.parse(href), { host: host }));
    };
    return SectionBrowserTitle;
}(react_1.Component));
exports.default = react_redux_1.connect(function (state) { return ({ parsedHost: state.view.parsedHost }); }, null)(SectionBrowserTitle);
//# sourceMappingURL=browser.js.map