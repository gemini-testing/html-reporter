'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var url_1 = tslib_1.__importDefault(require("url"));
var react_1 = tslib_1.__importStar(require("react"));
var toggle_open_1 = tslib_1.__importDefault(require("./toggle-open"));
var lodash_1 = tslib_1.__importDefault(require("lodash"));
function mkLinkToUrl(url, text) {
    if (text === void 0) { text = url; }
    return react_1.default.createElement("a", { "data-suite-view-link": url, className: 'section__icon_view-local', target: '_blank', href: url }, text);
}
function isUrl(str) {
    if (typeof str !== 'string') {
        return false;
    }
    var parsedUrl = url_1.default.parse(str);
    return !(!parsedUrl.host || !parsedUrl.protocol);
}
var metaToElements = function (metaInfo) {
    return lodash_1.default.map(metaInfo, function (value, key) {
        var element = isUrl(value) ? mkLinkToUrl(value) : value;
        return react_1.default.createElement("div", { key: key, className: 'toggle-open__item' },
            react_1.default.createElement("span", { className: 'toggle-open__item-key' }, key),
            ": ",
            element);
    });
};
var MetaInfo = /** @class */ (function (_super) {
    tslib_1.__extends(MetaInfo, _super);
    function MetaInfo() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MetaInfo.prototype.render = function () {
        var _a = this.props, metaInfo = _a.metaInfo, suiteUrl = _a.suiteUrl;
        var formattedMetaInfo = tslib_1.__assign({}, metaInfo, { url: mkLinkToUrl(suiteUrl, metaInfo.url) });
        var metaElements = metaToElements(formattedMetaInfo);
        return (react_1.default.createElement(react_1.Fragment, null,
            react_1.default.createElement(toggle_open_1.default, { title: 'Meta-info', content: metaElements })));
    };
    return MetaInfo;
}(react_1.Component));
exports.default = MetaInfo;
//# sourceMappingURL=meta-info.js.map