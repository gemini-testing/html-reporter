'use strict';
import * as tslib_1 from "tslib";
import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import LazyLoad from 'react-lazy-load';
var Screenshot = /** @class */ (function (_super) {
    tslib_1.__extends(Screenshot, _super);
    function Screenshot() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Screenshot.prototype.render = function () {
        var _a = this.props, noCache = _a.noCache, imagePath = _a.imagePath, lazyLoadOffset = _a.lazyLoadOffset;
        var url = noCache
            ? addTimestamp(encodeUri(imagePath))
            : encodeUri(imagePath);
        var elem = React.createElement("img", { src: url, className: "image-box__screenshot" });
        return lazyLoadOffset ? React.createElement(LazyLoad, { offsetVertical: lazyLoadOffset }, elem) : elem;
    };
    Screenshot.propTypes = {
        noCache: PropTypes.bool,
        imagePath: PropTypes.string.isRequired,
        lazyLoadOffset: PropTypes.number
    };
    Screenshot.defaultProps = {
        noCache: false
    };
    return Screenshot;
}(Component));
export default connect(function (_a) {
    var lazyLoadOffset = _a.view.lazyLoadOffset;
    return ({ lazyLoadOffset: lazyLoadOffset });
})(Screenshot);
function encodeUri(imagePath) {
    return imagePath
        .split('/')
        .map(function (item) { return encodeURIComponent(item); })
        .join('/');
}
// for prevent image caching
function addTimestamp(imagePath) {
    return imagePath + "?t=" + Date.now();
}
//# sourceMappingURL=screenshot.js.map