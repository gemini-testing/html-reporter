"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var lodash_1 = tslib_1.__importDefault(require("lodash"));
var hermione_suite_adapter_1 = tslib_1.__importDefault(require("../suite-adapter/hermione-suite-adapter"));
var TestAdapter = require('./test-adapter');
var getSuitePath = require('../plugin-utils').getHermioneUtils().getSuitePath;
var getPathsFor = require('../server-utils').getPathsFor;
var _a = require('../constants/test-statuses'), SUCCESS = _a.SUCCESS, FAIL = _a.FAIL, ERROR = _a.ERROR;
module.exports = /** @class */ (function (_super) {
    tslib_1.__extends(HermioneTestResultAdapter, _super);
    function HermioneTestResultAdapter(_testResult, _tool) {
        if (_testResult === void 0) { _testResult = {}; }
        if (_tool === void 0) { _tool = {}; }
        var _this = _super.call(this, _testResult, _tool) || this;
        _this._testResult = _testResult;
        _this._tool = _tool;
        _this._errors = _this._tool.errors;
        _this._suite = hermione_suite_adapter_1.default.create(_this._testResult);
        return _this;
    }
    HermioneTestResultAdapter.create = function (testResult, tool) {
        if (testResult === void 0) { testResult = {}; }
        if (tool === void 0) { tool = {}; }
        return new this(testResult, tool);
    };
    HermioneTestResultAdapter.prototype.hasDiff = function () {
        var _this = this;
        return this.assertViewResults.some(function (result) { return _this.isImageDiffError(result); });
    };
    Object.defineProperty(HermioneTestResultAdapter.prototype, "assertViewResults", {
        get: function () {
            return this._testResult.assertViewResults || [];
        },
        enumerable: true,
        configurable: true
    });
    HermioneTestResultAdapter.prototype.isImageDiffError = function (assertResult) {
        return assertResult instanceof this._errors.ImageDiffError;
    };
    HermioneTestResultAdapter.prototype.isNoRefImageError = function (assertResult) {
        return assertResult instanceof this._errors.NoRefImageError;
    };
    HermioneTestResultAdapter.prototype.getImagesInfo = function () {
        var _this = this;
        if (!lodash_1.default.isEmpty(this.imagesInfo)) {
            return this.imagesInfo;
        }
        this.imagesInfo = this.assertViewResults.map(function (assertResult) {
            var status;
            var reason;
            if (!(assertResult instanceof Error)) {
                status = SUCCESS;
            }
            if (_this.isImageDiffError(assertResult)) {
                status = FAIL;
            }
            if (_this.isNoRefImageError(assertResult)) {
                status = ERROR;
                reason = lodash_1.default.pick(assertResult, ['message', 'stack']);
            }
            var stateName = assertResult.stateName, refImagePath = assertResult.refImagePath;
            return lodash_1.default.extend({ stateName: stateName, refImagePath: refImagePath, status: status, reason: reason }, getPathsFor(status, _this, stateName));
        });
        // common screenshot on test fail
        if (this.screenshot) {
            var errorImage = lodash_1.default.extend({ status: ERROR, reason: this.error }, getPathsFor(ERROR, this));
            this.imagesInfo.push(errorImage);
        }
        return this.imagesInfo;
    };
    Object.defineProperty(HermioneTestResultAdapter.prototype, "_firstAssertViewFail", {
        // hack which should be removed when html-reporter is able to show all assert view fails for one test
        get: function () {
            return lodash_1.default.find(this._testResult.assertViewResults, function (result) { return result instanceof Error; });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HermioneTestResultAdapter.prototype, "error", {
        get: function () {
            return lodash_1.default.pick(this._testResult.err, ['message', 'stack', 'stateName']);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HermioneTestResultAdapter.prototype, "imageDir", {
        get: function () {
            return this._testResult.id && this._testResult.id();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HermioneTestResultAdapter.prototype, "state", {
        get: function () {
            return { name: this._testResult.title };
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HermioneTestResultAdapter.prototype, "attempt", {
        get: function () {
            if (this._testResult.attempt >= 0) {
                return this._testResult.attempt;
            }
            var retry = this._tool.config.forBrowser(this._testResult.browserId).retry;
            return this._testResult.retriesLeft >= 0
                ? retry - this._testResult.retriesLeft - 1
                : retry;
        },
        // for correct determine image paths in gui
        set: function (attemptNum) {
            this._testResult.attempt = attemptNum;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HermioneTestResultAdapter.prototype, "screenshot", {
        get: function () {
            return lodash_1.default.get(this._testResult, 'err.screenshot');
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HermioneTestResultAdapter.prototype, "assertViewState", {
        get: function () {
            return this._firstAssertViewFail
                ? lodash_1.default.get(this._firstAssertViewFail, 'stateName')
                : lodash_1.default.get(this._testResult, 'err.stateName');
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HermioneTestResultAdapter.prototype, "description", {
        get: function () {
            return this._testResult.description;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HermioneTestResultAdapter.prototype, "meta", {
        get: function () {
            return this._testResult.meta;
        },
        enumerable: true,
        configurable: true
    });
    HermioneTestResultAdapter.prototype.getImagePath = function (stateName) {
        // @ts-ignore
        return (lodash_1.default.find(this.imagesInfo, { stateName: stateName }) || {}).imagePath;
    };
    HermioneTestResultAdapter.prototype.prepareTestResult = function () {
        var _a = this._testResult, name = _a.title, browserId = _a.browserId;
        var suitePath = getSuitePath(this._testResult);
        return { name: name, suitePath: suitePath, browserId: browserId };
    };
    Object.defineProperty(HermioneTestResultAdapter.prototype, "multipleTabs", {
        get: function () {
            return true;
        },
        enumerable: true,
        configurable: true
    });
    return HermioneTestResultAdapter;
}(TestAdapter));
//# sourceMappingURL=hermione-test-adapter.js.map