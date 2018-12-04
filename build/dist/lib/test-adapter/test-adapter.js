"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = /** @class */ (function () {
    function TestAdapter(_testResult, _tool) {
        if (_testResult === void 0) { _testResult = {}; }
        if (_tool === void 0) { _tool = {}; }
        this._testResult = _testResult;
        this._tool = _tool;
    }
    TestAdapter.create = function (testResult, tool) {
        if (testResult === void 0) { testResult = {}; }
        if (tool === void 0) { tool = {}; }
        return new this(testResult, tool);
    };
    Object.defineProperty(TestAdapter.prototype, "suite", {
        get: function () {
            return this._suite;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TestAdapter.prototype, "sessionId", {
        get: function () {
            return this._testResult.sessionId || 'unknown session id';
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TestAdapter.prototype, "browserId", {
        get: function () {
            return this._testResult.browserId;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TestAdapter.prototype, "imagesInfo", {
        get: function () {
            return this._testResult.imagesInfo;
        },
        set: function (imagesInfo) {
            this._testResult.imagesInfo = imagesInfo;
        },
        enumerable: true,
        configurable: true
    });
    return TestAdapter;
}());
//# sourceMappingURL=test-adapter.js.map