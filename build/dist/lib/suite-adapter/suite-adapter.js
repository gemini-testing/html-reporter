'use strict';
var _ = require('lodash');
var Uri = require('urijs');
var wrapLinkByTag = function (text) {
    return text.replace(/https?:\/\/[^\s]*/g, function (url) {
        return "<a target=\"_blank\" href=\"" + url + "\">" + url + "</a>";
    });
};
module.exports = /** @class */ (function () {
    function SuiteAdapter(suite, config) {
        this._suite = suite;
        this._config = config;
    }
    SuiteAdapter.create = function (suite, config) {
        if (suite === void 0) { suite = {}; }
        if (config === void 0) { config = {}; }
        return new this(suite, config);
    };
    SuiteAdapter.prototype._wrapSkipComment = function (skipComment) {
        return skipComment ? wrapLinkByTag(skipComment) : 'Unknown reason';
    };
    SuiteAdapter.prototype._configureUrl = function (url, baseHost) {
        return _.isEmpty(baseHost)
            ? url
            : Uri(baseHost).resource(url).href();
    };
    return SuiteAdapter;
}());
//# sourceMappingURL=suite-adapter.js.map