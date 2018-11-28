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
var TestAdapter = require('./test-adapter');
var GeminiSuiteAdapter = require('../suite-adapter/gemini-suite-adapter');
var getPathsFor = require('../server-utils').getPathsFor;
var IDLE = require('../constants/test-statuses').IDLE;
module.exports = /** @class */ (function (_super) {
    __extends(GeminiTestResultAdapter, _super);
    function GeminiTestResultAdapter(testResult, tool) {
        if (tool === void 0) { tool = {}; }
        var _this = _super.call(this, testResult) || this;
        _this._suite = GeminiSuiteAdapter.create(_this._testResult.suite, tool.config);
        return _this;
    }
    GeminiTestResultAdapter.prototype.saveDiffTo = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var _a;
        return (_a = this._testResult).saveDiffTo.apply(_a, args);
    };
    GeminiTestResultAdapter.prototype.hasDiff = function () {
        return this._testResult.hasOwnProperty('equal') && !this._testResult.equal;
    };
    GeminiTestResultAdapter.prototype.getImagesInfo = function (status) {
        var reason = !_.isEmpty(this.error) && this.error;
        this.imagesInfo = status === IDLE
            ? [{ status: status, expectedPath: this._testResult.referencePath }]
            : [].concat(_.extend({ status: status, reason: reason }, getPathsFor(status, this)));
        return this.imagesInfo;
    };
    Object.defineProperty(GeminiTestResultAdapter.prototype, "error", {
        get: function () {
            return _.pick(this._testResult, ['message', 'stack']);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GeminiTestResultAdapter.prototype, "imageDir", {
        get: function () {
            var components = [].concat(this._testResult.suite.path, this._testResult.state.name);
            return path.join.apply(null, components);
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
        var _a = this._testResult, name = _a.state.name, suite = _a.suite, browserId = _a.browserId;
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