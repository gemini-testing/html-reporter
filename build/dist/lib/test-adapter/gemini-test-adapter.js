"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var lodash_1 = tslib_1.__importDefault(require("lodash"));
var path_1 = tslib_1.__importDefault(require("path"));
var gemini_suite_adapter_1 = tslib_1.__importDefault(require("../suite-adapter/gemini-suite-adapter"));
var TestAdapter = require('./test-adapter');
var getPathsFor = require('../server-utils').getPathsFor;
var IDLE = require('../constants/test-statuses').IDLE;
module.exports = /** @class */ (function (_super) {
    tslib_1.__extends(GeminiTestResultAdapter, _super);
    function GeminiTestResultAdapter(_testResult, _tool) {
        if (_testResult === void 0) { _testResult = {}; }
        if (_tool === void 0) { _tool = {}; }
        var _this = _super.call(this, _testResult) || this;
        _this._testResult = _testResult;
        _this._tool = _tool;
        _this._suite = gemini_suite_adapter_1.default.create(_this._testResult.suite, _tool.config);
        return _this;
    }
    GeminiTestResultAdapter.create = function (testResult, tool) {
        if (testResult === void 0) { testResult = {}; }
        if (tool === void 0) { tool = {}; }
        return new this(testResult, tool);
    };
    GeminiTestResultAdapter.prototype.saveDiffTo = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var _a;
        return this._testResult.saveDiffTo && (_a = this._testResult).saveDiffTo.apply(_a, args);
    };
    GeminiTestResultAdapter.prototype.hasDiff = function () {
        return this._testResult.hasOwnProperty('equal') && !this._testResult.equal;
    };
    GeminiTestResultAdapter.prototype.getImagesInfo = function (status) {
        var reason = !lodash_1.default.isEmpty(this.error) && this.error;
        this.imagesInfo = status === IDLE
            ? [{ status: status, expectedPath: this._testResult.referencePath }]
            : [].concat(lodash_1.default.extend({ status: status, reason: reason }, getPathsFor(status, this)));
        return this.imagesInfo;
    };
    Object.defineProperty(GeminiTestResultAdapter.prototype, "error", {
        get: function () {
            return lodash_1.default.pick(this._testResult, ['message', 'stack']);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GeminiTestResultAdapter.prototype, "imageDir", {
        get: function () {
            var components = (new Array()).concat(this._testResult.suite && this._testResult.suite.path || [], this._testResult.state && this._testResult.state.name || []);
            return path_1.default.join.apply(null, components);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GeminiTestResultAdapter.prototype, "state", {
        get: function () {
            return this._testResult.state;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GeminiTestResultAdapter.prototype, "attempt", {
        get: function () {
            return this._testResult.attempt;
        },
        // for correct determine image paths in gui
        set: function (attemptNum) {
            this._testResult.attempt = attemptNum;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GeminiTestResultAdapter.prototype, "referencePath", {
        get: function () {
            return this._testResult.referencePath;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GeminiTestResultAdapter.prototype, "currentPath", {
        get: function () {
            return this._testResult.currentPath;
        },
        enumerable: true,
        configurable: true
    });
    GeminiTestResultAdapter.prototype.getImagePath = function () {
        return this._testResult.imagePath;
    };
    GeminiTestResultAdapter.prototype.prepareTestResult = function () {
        // @ts-ignore
        var _a = this._testResult, name = _a.state.name, suite = _a.suite, browserId = _a.browserId;
        // @ts-ignore
        var suitePath = suite.path.concat(name);
        return { name: name, suitePath: suitePath, browserId: browserId };
    };
    Object.defineProperty(GeminiTestResultAdapter.prototype, "multipleTabs", {
        get: function () {
            return false;
        },
        enumerable: true,
        configurable: true
    });
    return GeminiTestResultAdapter;
}(TestAdapter));
//# sourceMappingURL=gemini-test-adapter.js.map