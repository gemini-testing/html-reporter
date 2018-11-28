'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var _ = require('lodash');
var path = require('path');
var url = require('url');
var SuiteAdapter = require('./suite-adapter');
var getSuitePath = require('../plugin-utils').getHermioneUtils().getSuitePath;
module.exports = /** @class */ (function (_super) {
    __extends(HermioneSuiteAdapter, _super);
    function HermioneSuiteAdapter() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(HermioneSuiteAdapter.prototype, "skipComment", {
        get: function () {
            var skipComment = getSkipComment(this._suite);
            return this._wrapSkipComment(skipComment);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HermioneSuiteAdapter.prototype, "fullName", {
        get: function () {
            return this._suite.fullTitle();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HermioneSuiteAdapter.prototype, "path", {
        get: function () {
            return getSuitePath(this._suite.parent);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HermioneSuiteAdapter.prototype, "file", {
        get: function () {
            return path.relative(process.cwd(), this._suite.file);
        },
        enumerable: true,
        configurable: true
    });
    HermioneSuiteAdapter.prototype.getUrl = function (opts) {
        if (opts === void 0) { opts = {}; }
        var url = _.get(this, '_suite.meta.url', '');
        return _super.prototype._configureUrl.call(this, url, opts.baseHost);
    };
    Object.defineProperty(HermioneSuiteAdapter.prototype, "fullUrl", {
        get: function () {
            var baseUrl = this.getUrl();
            return baseUrl
                ? url.parse(baseUrl).path
                : '';
        },
        enumerable: true,
        configurable: true
    });
    return HermioneSuiteAdapter;
}(SuiteAdapter));
function getSkipComment(suite) {
    return suite.skipReason || suite.parent && getSkipComment(suite.parent);
}
//# sourceMappingURL=hermione-suite-adapter.js.map