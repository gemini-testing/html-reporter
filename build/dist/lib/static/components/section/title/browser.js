'use strict';
import * as tslib_1 from "tslib";
import url from 'url';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
var SectionBrowserTitle = /** @class */ (function (_super) {
    tslib_1.__extends(SectionBrowserTitle, _super);
    function SectionBrowserTitle() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SectionBrowserTitle.prototype.render = function () {
        var _a = this.props, name = _a.name, result = _a.result, handler = _a.handler, parsedHost = _a.parsedHost;
        return (React.createElement("div", { className: "section__title", onClick: handler },
            name,
            React.createElement("a", { className: "button section__icon section__icon_view-local", href: this._buildUrl(result.suiteUrl, parsedHost), onClick: function (e) { return e.stopPropagation(); }, title: "view in browser", target: "_blank" })));
    };
    SectionBrowserTitle.prototype._buildUrl = function (href, host) {
        return host
            ? url.format(Object.assign(url.parse(href), host))
            : href;
    };
    SectionBrowserTitle.propTypes = {
        name: PropTypes.string.isRequired,
        result: PropTypes.object.isRequired,
        handler: PropTypes.func.isRequired,
        parsedHost: PropTypes.object
    };
    return SectionBrowserTitle;
}(Component));
export default connect(function (state) { return ({ parsedHost: state.view.parsedHost }); }, null)(SectionBrowserTitle);
//# sourceMappingURL=browser.js.map