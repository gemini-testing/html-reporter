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
var TestAdapter = require('./test-adapter');
var HermioneSuiteAdapter = require('../suite-adapter/hermione-suite-adapter.js');
var getSuitePath = require('../plugin-utils').getHermioneUtils().getSuitePath;
var getPathsFor = require('../server-utils').getPathsFor;
var _a = require('../constants/test-statuses'), SUCCESS = _a.SUCCESS, FAIL = _a.FAIL, ERROR = _a.ERROR;
module.exports = /** @class */ (function (_super) {
    __extends(HermioneTestResultAdapter, _super);
    function HermioneTestResultAdapter(testResult, tool) {
        var _this = _super.call(this, testResult) || this;
        _this._tool = tool;
        _this._errors = _this._tool.errors;
        _this._suite = HermioneSuiteAdapter.create(_this._testResult);
        return _this;
    }
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
        if (!_.isEmpty(this.imagesInfo)) {
            return this.imagesInfo;
        }
        this.imagesInfo = this.assertViewResults.map(function (assertResult) {
            var status, reason;
            if (!(assertResult instanceof Error)) {
                status = SUCCESS;
            }
            if (_this.isImageDiffError(assertResult)) {
                status = FAIL;
            }
            if (_this.isNoRefImageError(assertResult)) {
                status = ERROR;
                reason = _.pick(assertResult, ['message', 'stack']);
            }
            var stateName = assertResult.stateName, refImagePath = assertResult.refImagePath;
            return _.extend({ stateName: stateName, refImagePath: refImagePath, status: status, reason: reason }, getPathsFor(status, _this, stateName));
        });
        // common screenshot on test fail
        if (this.screenshot) {
            var errorImage = _.extend({ status: ERROR, reason: this.error }, getPathsFor(ERROR, this));
            this.imagesInfo.push(errorImage);
        }
        return this.imagesInfo;
    };
    Object.defineProperty(HermioneTestResultAdapter.prototype, "_firstAssertViewFail", {
        // hack which should be removed when html-reporter is able to show all assert view fails for one test
        get: function () {
            return _.find(this._testResult.assertViewResults, function (result) { return result instanceof Error; });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HermioneTestResultAdapter.prototype, "error", {
        get: function () {
            return _.pick(this._testResult.err, ['message', 'stack', 'stateName']);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HermioneTestResultAdapter.prototype, "imageDir", {
        get: function () {
            return this._testResult.id();
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
            return _.get(this._testResult, 'err.screenshot');
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HermioneTestResultAdapter.prototype, "assertViewState", {
        get: function () {
            return this._firstAssertViewFail
                ? _.get(this._firstAssertViewFail, 'stateName')
                : _.get(this._testResult, 'err.stateName');
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
        return (_.find(this.imagesInfo, { stateName: stateName }) || {}).imagePath;
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