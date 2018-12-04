"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var lodash_1 = tslib_1.__importDefault(require("lodash"));
var urijs_1 = tslib_1.__importDefault(require("urijs"));
function wrapLinkByTag(text) {
    return text.replace(/https?:\/\/[^\s]*/g, function (url) {
        return "<a target=\"_blank\" href=\"" + url + "\">" + url + "</a>";
    });
}
var SuiteAdapter = /** @class */ (function () {
    function SuiteAdapter(_suite, _config) {
        this._suite = _suite;
        this._config = _config;
    }
    SuiteAdapter.create = function (suite, config) {
        if (config === void 0) { config = {}; }
        return new this(suite, config);
    };
    SuiteAdapter.prototype._wrapSkipComment = function (skipComment) {
        return skipComment ? wrapLinkByTag(skipComment) : 'Unknown reason';
    };
    SuiteAdapter.prototype._configureUrl = function (url, baseHost) {
        return lodash_1.default.isEmpty(baseHost)
            ? url
            : urijs_1.default(baseHost).resource(url).href();
    };
    return SuiteAdapter;
}());
exports.SuiteAdapter = SuiteAdapter;
//# sourceMappingURL=suite-adapter.js.map