"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var suite_adapter_1 = require("./suite-adapter");
var GeminiSuiteAdapter = /** @class */ (function (_super) {
    tslib_1.__extends(GeminiSuiteAdapter, _super);
    function GeminiSuiteAdapter(_suite, _config) {
        if (_config === void 0) { _config = {}; }
        var _this = _super.call(this, _suite, _config) || this;
        _this._suite = _suite;
        _this._config = _config;
        return _this;
    }
    GeminiSuiteAdapter.create = function (suite, config) {
        if (config === void 0) { config = {}; }
        return new this(suite, config);
    };
    Object.defineProperty(GeminiSuiteAdapter.prototype, "skipComment", {
        get: function () {
            return this._wrapSkipComment(this._suite.skipComment);
        },
        enumerable: true,
        configurable: true
    });
    GeminiSuiteAdapter.prototype.getUrl = function (opts) {
        if (opts === void 0) { opts = {}; }
        if (this._config.forBrowser) {
            var browserConfig = this._config.forBrowser(opts.browserId || '');
            var url = browserConfig.getAbsoluteUrl(this._suite.url);
            return this._configureUrl(url, opts.baseHost || '');
        }
        return '';
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
}(suite_adapter_1.SuiteAdapter));
exports.default = GeminiSuiteAdapter;
//# sourceMappingURL=gemini-suite-adapter.js.map