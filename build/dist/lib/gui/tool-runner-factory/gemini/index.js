"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var path = require('path');
var _ = require('lodash');
var BaseToolRunner = require('../base-tool-runner');
var Runner = require('../runner');
var subscribeOnToolEvents = require('./report-subscriber');
var formatTests = require('../utils').formatTests;
module.exports = /** @class */ (function (_super) {
    tslib_1.__extends(GeminiRunner, _super);
    function GeminiRunner(paths, tool, configs) {
        var _this = _super.call(this, paths, tool, configs) || this;
        _this._collectionStates = null;
        return _this;
    }
    GeminiRunner.prototype.run = function (tests) {
        var _this = this;
        if (tests === void 0) { tests = []; }
        var formattedTests = _.flatMap([].concat(tests), function (test) { return formatTests(test); });
        return Runner.create(this._toolName, this._collection, formattedTests)
            .run(function (collection) { return _this._tool.test(collection, { reporters: ['vflat'] }); });
    };
    GeminiRunner.prototype._handleRunnableCollection = function () {
        var _this = this;
        var browsers = this._globalOpts.browser;
        var suites = this._collection.topLevelSuites();
        if (browsers) {
            suites.forEach(function (suite) {
                suite.browsers = _.intersection(suite.browsers, browsers);
            });
        }
        this._collectionStates = getAllStates(this._collection.clone().allSuites());
        this._collectionStates.forEach(function (state) {
            if (state.state.shouldSkip(state.browserId)) {
                return _this._reportBuilder.addSkipped(state);
            }
            var referencePath = _this._tool.getScreenshotPath(state.suite, state.state.name, state.browserId);
            state.referencePath = path.relative(process.cwd(), referencePath);
            return _this._reportBuilder.addIdle(state);
        });
        this._fillTestsTree();
    };
    GeminiRunner.prototype._subscribeOnEvents = function () {
        subscribeOnToolEvents(this._tool, this._reportBuilder, this._eventSource, this._reportPath);
    };
    GeminiRunner.prototype._prepareUpdateResult = function (test) {
        var searchBy = _.pick(test, ['suite', 'state', 'browserId']);
        var currentState = _.find(this._collectionStates, searchBy);
        var imagePath = this._tool.getScreenshotPath(currentState.suite, test.state.name, test.browserId);
        var _a = test.metaInfo, sessionId = _a.sessionId, fullUrl = _a.url, attempt = test.attempt, actualPath = test.actualPath;
        var imagesInfo = test.imagesInfo.map(function (imageInfo) { return _.set(imageInfo, 'imagePath', imagePath); });
        var testResult = {
            suite: _.pick(currentState.suite, ['file', 'name', 'path', 'url']),
            state: _.pick(currentState.state, 'name'),
            browserId: currentState.browserId
        };
        return _.merge(testResult, { imagePath: imagePath, sessionId: sessionId, attempt: attempt, imagesInfo: imagesInfo, actualPath: actualPath, suite: { fullUrl: fullUrl }, updated: true });
    };
    return GeminiRunner;
}(BaseToolRunner));
function getAllStates(suites) {
    return suites.reduce(function (acc, suite) {
        suite.states.forEach(function (state) {
            state.browsers.forEach(function (browserId) {
                acc.push({
                    suite: state.suite,
                    state: state,
                    browserId: browserId
                });
            });
        });
        return acc;
    }, []);
}
//# sourceMappingURL=index.js.map