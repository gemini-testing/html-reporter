"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var lodash_1 = tslib_1.__importDefault(require("lodash"));
var path_1 = tslib_1.__importDefault(require("path"));
var url_1 = tslib_1.__importDefault(require("url"));
var suite_adapter_1 = require("./suite-adapter");
var plugin_utils_1 = require("../plugin-utils");
var getSuitePath = plugin_utils_1.getHermioneUtils().getSuitePath;
var HermioneSuiteAdapter = /** @class */ (function (_super) {
    tslib_1.__extends(HermioneSuiteAdapter, _super);
    function HermioneSuiteAdapter(_suite, _config) {
        if (_config === void 0) { _config = {}; }
        var _this = _super.call(this, _suite, _config) || this;
        _this._suite = _suite;
        _this._config = _config;
        return _this;
    }
    HermioneSuiteAdapter.create = function (suite, config) {
        if (config === void 0) { config = {}; }
        return new this(suite, config);
    };
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
            return this._suite.fullTitle && this._suite.fullTitle();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HermioneSuiteAdapter.prototype, "path", {
        get: function () {
            // TODO: create typings for that func, and delete "as"
            return getSuitePath(this._suite.parent);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HermioneSuiteAdapter.prototype, "file", {
        get: function () {
            return path_1.default.relative(process.cwd(), this._suite.file || '');
        },
        enumerable: true,
        configurable: true
    });
    HermioneSuiteAdapter.prototype.getUrl = function (opts) {
        if (opts === void 0) { opts = {}; }
        var url = lodash_1.default.get(this, '_suite.meta.url', '');
        return _super.prototype._configureUrl.call(this, url, opts.baseHost || '');
    };
    Object.defineProperty(HermioneSuiteAdapter.prototype, "fullUrl", {
        get: function () {
            var baseUrl = this.getUrl();
            return baseUrl
                ? url_1.default.parse(baseUrl).path
                : '';
        },
        enumerable: true,
        configurable: true
    });
    return HermioneSuiteAdapter;
}(suite_adapter_1.SuiteAdapter));
exports.default = HermioneSuiteAdapter;
function getSkipComment(suite) {
    return suite.skipReason || suite.parent && getSkipComment(suite.parent);
}
//# sourceMappingURL=hermione-suite-adapter.js.map