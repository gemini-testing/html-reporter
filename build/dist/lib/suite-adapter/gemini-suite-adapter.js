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
var SuiteAdapter = require('./suite-adapter');
module.exports = /** @class */ (function (_super) {
    __extends(GeminiSuiteAdapter, _super);
    function GeminiSuiteAdapter() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(GeminiSuiteAdapter.prototype, "skipComment", {
        get: function () {
            return this._wrapSkipComment(this._suite.skipComment);
        },
        enumerable: true,
        configurable: true
    });
    GeminiSuiteAdapter.prototype.getUrl = function (opts) {
        if (opts === void 0) { opts = {}; }
        var browserConfig = this._config.forBrowser(opts.browserId);
        var url = browserConfig.getAbsoluteUrl(this._suite.url);
        return _super.prototype._configureUrl.call(this, url, opts.baseHost);
    };
    Object.defineProperty(GeminiSuiteAdapter.prototype, "fullUrl", {
        get: function () {
            return this._suite.fullUrl;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GeminiSuiteAdapter.prototype, "path", {
        get: function () {
            return this._suite.path;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GeminiSuiteAdapter.prototype, "file", {
        get: function () {
            return this._suite.file;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GeminiSuiteAdapter.prototype, "fullName", {
        get: function () {
            return this._suite.fullName;
        },
        enumerable: true,
        configurable: true
    });
    return GeminiSuiteAdapter;
}(SuiteAdapter));
//# sourceMappingURL=gemini-suite-adapter.js.map