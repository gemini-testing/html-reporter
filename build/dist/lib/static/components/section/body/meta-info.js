'use strict';
import * as tslib_1 from "tslib";
import url from 'url';
import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { map } from 'lodash';
import ToggleOpen from './toggle-open';
var mkLinkToUrl = function (url, text) {
    if (text === void 0) { text = url; }
    return React.createElement("a", { "data-suite-view-link": url, className: "section__icon_view-local", target: "_blank", href: url }, text);
};
var isUrl = function (str) {
    if (typeof str !== 'string') {
        return false;
    }
    var parsedUrl = url.parse(str);
    return parsedUrl.host && parsedUrl.protocol;
};
var metaToElements = function (metaInfo) {
    return map(metaInfo, function (value, key) {
        if (isUrl(value)) {
            value = mkLinkToUrl(value);
        }
        return React.createElement("div", { key: key, className: "toggle-open__item" },
            React.createElement("span", { className: "toggle-open__item-key" }, key),
            ": ",
            value);
    });
};
var MetaInfo = /** @class */ (function (_super) {
    tslib_1.__extends(MetaInfo, _super);
    function MetaInfo() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MetaInfo.prototype.render = function () {
        var _a = this.props, metaInfo = _a.metaInfo, suiteUrl = _a.suiteUrl;
        var formattedMetaInfo = Object.assign({}, metaInfo, { url: mkLinkToUrl(suiteUrl, metaInfo.url) });
        var metaElements = metaToElements(formattedMetaInfo);
        return (React.createElement(Fragment, null,
            React.createElement(ToggleOpen, { title: 'Meta-info', content: metaElements })));
    };
    MetaInfo.propTypes = {
        metaInfo: PropTypes.object.isRequired,
        suiteUrl: PropTypes.string.isRequired
    };
    return MetaInfo;
}(Component));
export default MetaInfo;
//# sourceMappingURL=meta-info.js.map