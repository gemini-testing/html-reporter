'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
var _ = require('lodash');
var Promise = require('bluebird');
var mergeReports = require('lib/merge-reports');
var ReportBuilder = require('lib/merge-reports/report-builder');
describe('lib/merge-reports', function () {
    var sandbox = sinon.sandbox.create();
    var execMergeReports_ = function (paths, opts) {
        if (paths === void 0) { paths = []; }
        if (opts === void 0) { opts = {}; }
        return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        opts = _.defaults(opts, { destination: 'default-dest-report/path' });
                        return [4 /*yield*/, mergeReports(paths, opts)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    beforeEach(function () {
        sandbox.stub(ReportBuilder, 'create').returns(Object.create(ReportBuilder.prototype));
        sandbox.stub(ReportBuilder.prototype, 'build').resolves();
    });
    afterEach(function () { return sandbox.restore(); });
    describe('options validation', function () {
        it('should throw error if no source reports paths are specified', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, assert.isRejected(execMergeReports_([]), 'Nothing to merge, no source reports are passed')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should throw error if destination report path exists in passed source reports paths', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, assert.isRejected(execMergeReports_(['src-report/path', 'dest-report/path'], { destination: 'dest-report/path' }), 'Destination report path: dest-report/path, exists in source report paths')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    it('should not fail if only one source report is specified', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, assert.isFulfilled(execMergeReports_(['src-report/path']))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('should create "ReportBuilder" instance with passed sources and destination paths', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, execMergeReports_(['src-report/path-1', 'src-report/path-2'], { destination: 'dest-report/path' })];
                case 1:
                    _a.sent();
                    assert.calledOnceWith(ReportBuilder.create, ['src-report/path-1', 'src-report/path-2'], 'dest-report/path');
                    return [2 /*return*/];
            }
        });
    }); });
    it('should wait until build report will be finished', function () { return __awaiter(_this, void 0, void 0, function () {
        var afterBuild;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    afterBuild = sinon.spy().named('afterBuild');
                    ReportBuilder.prototype.build.callsFake(function () { return Promise.delay(10).then(afterBuild); });
                    return [4 /*yield*/, execMergeReports_(['src-report/path-1', 'src-report/path-2'], { destination: 'dest-report/path' })];
                case 1:
                    _a.sent();
                    assert.calledOnce(afterBuild);
                    return [2 /*return*/];
            }
        });
    }); });
});
//# sourceMappingURL=index.js.map