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
var BaseToolRunner = require('../base-tool-runner');
var Runner = require('../runner');
var subscribeOnToolEvents = require('./report-subscriber');
var formatTests = require('../utils').formatTests;
var _a = require('./utils'), formatId = _a.formatId, getShortMD5 = _a.getShortMD5, mkFullTitle = _a.mkFullTitle;
module.exports = /** @class */ (function (_super) {
    __extends(HermioneRunner, _super);
    function HermioneRunner(paths, tool, configs) {
        var _this = _super.call(this, paths, tool, configs) || this;
        _this._tests = {};
        return _this;
    }
    HermioneRunner.prototype.run = function (tests) {
        var _this = this;
        if (tests === void 0) { tests = []; }
        var _a = this._globalOpts, grep = _a.grep, sets = _a.set, browsers = _a.browser;
        var formattedTests = _.flatMap([].concat(tests), function (test) { return formatTests(test); });
        return Runner.create(this._toolName, this._collection, formattedTests)
            .run(function (collection) { return _this._tool.run(collection, { grep: grep, sets: sets, browsers: browsers }); });
    };
    HermioneRunner.prototype._handleRunnableCollection = function () {
        var _this = this;
        this._collection.eachTest(function (test, browserId) {
            if (test.disabled || test.silentSkip) {
                return;
            }
            var testId = formatId(test.id(), browserId);
            _this._tests[testId] = _.extend(test, { browserId: browserId });
            test.pending
                ? _this._reportBuilder.addSkipped(test)
                : _this._reportBuilder.addIdle(test);
        });
        this._fillTestsTree();
    };
    HermioneRunner.prototype._subscribeOnEvents = function () {
        subscribeOnToolEvents(this._tool, this._reportBuilder, this._eventSource, this._reportPath);
    };
    HermioneRunner.prototype._prepareUpdateResult = function (test) {
        var _this = this;
        var browserId = test.browserId, attempt = test.attempt;
        var fullTitle = mkFullTitle(test);
        var testId = formatId(getShortMD5(fullTitle), browserId);
        var testResult = this._tests[testId];
        var _a = test.metaInfo, sessionId = _a.sessionId, url = _a.url;
        var imagesInfo = test.imagesInfo.map(function (imageInfo) {
            var stateName = imageInfo.stateName;
            var imagePath = _this._tool.config.browsers[browserId].getScreenshotPath(testResult, stateName);
            return _.extend(imageInfo, { imagePath: imagePath });
        });
        return _.merge({}, testResult, { imagesInfo: imagesInfo, sessionId: sessionId, attempt: attempt, meta: { url: url }, updated: true });
    };
    return HermioneRunner;
}(BaseToolRunner));
//# sourceMappingURL=index.js.map