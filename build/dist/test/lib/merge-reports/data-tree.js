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
var path = require('path');
var fs = require('fs-extra');
var DataTree = require('lib/merge-reports/data-tree');
var _a = require('test/utils'), mkSuiteTree = _a.mkSuiteTree, mkSuite = _a.mkSuite, mkState = _a.mkState, mkBrowserResult = _a.mkBrowserResult, mkTestResult = _a.mkTestResult;
var _b = require('lib/constants/test-statuses'), SUCCESS = _b.SUCCESS, FAIL = _b.FAIL, ERROR = _b.ERROR, SKIPPED = _b.SKIPPED;
describe('lib/merge-reports/data-tree', function () {
    var sandbox = sinon.sandbox.create();
    var mkDataTree_ = function (initialData, destPath) {
        if (initialData === void 0) { initialData = {}; }
        if (destPath === void 0) { destPath = 'default-dest-report/path'; }
        return DataTree.create(initialData, destPath);
    };
    var mkData_ = function (data) {
        if (data === void 0) { data = {}; }
        return _.defaults(data, { suites: [], skips: [] });
    };
    beforeEach(function () {
        sandbox.stub(fs, 'moveAsync');
    });
    afterEach(function () { return sandbox.restore(); });
    describe('merge "skips" data', function () {
        it('should add skip info that does not exist in tree', function () { return __awaiter(_this, void 0, void 0, function () {
            var skipInfo, initialData, dataCollection, skips;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        skipInfo = { suite: 'some-suite', browser: 'yabro' };
                        initialData = mkData_();
                        dataCollection = { 'src-report/path': mkData_({ skips: [skipInfo] }) };
                        return [4 /*yield*/, mkDataTree_(initialData).mergeWith(dataCollection)];
                    case 1:
                        skips = (_a.sent()).skips;
                        assert.deepEqual(skips, [skipInfo]);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should add skip info if in tree test is skipped in another browser', function () { return __awaiter(_this, void 0, void 0, function () {
            var skipInfo1, skipInfo2, initialData, dataCollection, skips;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        skipInfo1 = { suite: 'some-suite', browser: 'yabro' };
                        skipInfo2 = { suite: 'some-suite', browser: 'foobro' };
                        initialData = mkData_({ skips: [skipInfo1] });
                        dataCollection = { 'src-report/path': mkData_({ skips: [skipInfo2] }) };
                        return [4 /*yield*/, mkDataTree_(initialData).mergeWith(dataCollection)];
                    case 1:
                        skips = (_a.sent()).skips;
                        assert.deepEqual(skips, [skipInfo1, skipInfo2]);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should not add skip info that exists in tree', function () { return __awaiter(_this, void 0, void 0, function () {
            var skipInfo1, skipInfo2, initialData, dataCollection, skips;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        skipInfo1 = { suite: 'some-suite', browser: 'yabro' };
                        skipInfo2 = { suite: 'some-suite', browser: 'yabro' };
                        initialData = mkData_({ skips: [skipInfo1] });
                        dataCollection = { 'src-report/path': mkData_({ skips: [skipInfo2] }) };
                        return [4 /*yield*/, mkDataTree_(initialData).mergeWith(dataCollection)];
                    case 1:
                        skips = (_a.sent()).skips;
                        assert.deepEqual(skips, [skipInfo1]);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('merge "suites" data', function () {
        it('should add data from non-existent suite in tree', function () { return __awaiter(_this, void 0, void 0, function () {
            var srcDataSuites1, srcDataSuites2, initialData, dataCollection, suites;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        srcDataSuites1 = mkSuiteTree({ suite: mkSuite({ suitePath: ['suite1'] }) });
                        srcDataSuites2 = mkSuiteTree({ suite: mkSuite({ suitePath: ['suite2'] }) });
                        initialData = mkData_({ suites: [srcDataSuites1] });
                        dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                        return [4 /*yield*/, mkDataTree_(initialData).mergeWith(dataCollection)];
                    case 1:
                        suites = (_a.sent()).suites;
                        assert.deepEqual(suites[1], srcDataSuites2);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should add data from non-existent state in tree', function () { return __awaiter(_this, void 0, void 0, function () {
            var srcDataSuites1, srcDataSuites2, initialData, dataCollection, suites;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        srcDataSuites1 = mkSuiteTree({
                            suite: mkSuite({ suitePath: ['suite'] }),
                            state: mkState({ suitePath: ['suite', 'state'] })
                        });
                        srcDataSuites2 = mkSuiteTree({
                            suite: mkSuite({ suitePath: ['suite'] }),
                            state: mkState({ suitePath: ['suite', 'state2'] })
                        });
                        initialData = mkData_({ suites: [srcDataSuites1] });
                        dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                        return [4 /*yield*/, mkDataTree_(initialData).mergeWith(dataCollection)];
                    case 1:
                        suites = (_a.sent()).suites;
                        assert.deepEqual(suites[0].children[1], srcDataSuites2.children[0]);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should add data from non-existent browser in tree', function () { return __awaiter(_this, void 0, void 0, function () {
            var srcDataSuites1, srcDataSuites2, initialData, dataCollection, suites;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        srcDataSuites1 = mkSuiteTree({
                            suite: mkSuite({ suitePath: ['suite'] }),
                            state: mkState({ suitePath: ['suite', 'state'] }),
                            browsers: []
                        });
                        srcDataSuites2 = mkSuiteTree({
                            suite: mkSuite({ suitePath: ['suite'] }),
                            state: mkState({ suitePath: ['suite', 'state'] }),
                            browsers: [mkBrowserResult(mkTestResult({ name: 'yabro' }))]
                        });
                        initialData = mkData_({ suites: [srcDataSuites1] });
                        dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                        return [4 /*yield*/, mkDataTree_(initialData).mergeWith(dataCollection)];
                    case 1:
                        suites = (_a.sent()).suites;
                        assert.deepEqual(suites[0].children[0].browsers[0], srcDataSuites2.children[0].browsers[0]);
                        return [2 /*return*/];
                }
            });
        }); });
        describe('from existent browser with correct modified "attempt" field', function () {
            it('should merge browser results if there are no successful tests', function () { return __awaiter(_this, void 0, void 0, function () {
                var srcDataSuites1, srcDataSuites2, initialData, dataCollection, suites;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            srcDataSuites1 = mkSuiteTree({
                                browsers: [mkBrowserResult({
                                        name: 'yabro',
                                        result: mkTestResult({ status: ERROR, attempt: 1 }),
                                        retries: [mkTestResult({ status: ERROR, attempt: 0 })]
                                    })]
                            });
                            srcDataSuites2 = mkSuiteTree({
                                browsers: [mkBrowserResult({
                                        name: 'yabro',
                                        result: mkTestResult({ status: FAIL, attempt: 1 }),
                                        retries: [mkTestResult({ status: FAIL, attempt: 0 })]
                                    })]
                            });
                            initialData = mkData_({ suites: [srcDataSuites1] });
                            dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                            return [4 /*yield*/, mkDataTree_(initialData).mergeWith(dataCollection)];
                        case 1:
                            suites = (_a.sent()).suites;
                            assert.deepEqual(suites[0].children[0].browsers[0], {
                                name: 'yabro',
                                result: mkTestResult({ status: FAIL, attempt: 3 }),
                                retries: [
                                    mkTestResult({ status: ERROR, attempt: 0 }),
                                    mkTestResult({ status: ERROR, attempt: 1 }),
                                    mkTestResult({ status: FAIL, attempt: 2 })
                                ]
                            });
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should add failed result even if it is already successed in tree', function () { return __awaiter(_this, void 0, void 0, function () {
                var srcDataSuites1, srcDataSuites2, initialData, dataCollection, suites;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            srcDataSuites1 = mkSuiteTree({
                                browsers: [mkBrowserResult({
                                        name: 'yabro',
                                        result: mkTestResult({ status: SUCCESS, attempt: 0 })
                                    })]
                            });
                            srcDataSuites2 = mkSuiteTree({
                                browsers: [mkBrowserResult({
                                        name: 'yabro',
                                        result: mkTestResult({ status: FAIL, attempt: 0 })
                                    })]
                            });
                            initialData = mkData_({ suites: [srcDataSuites1] });
                            dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                            return [4 /*yield*/, mkDataTree_(initialData).mergeWith(dataCollection)];
                        case 1:
                            suites = (_a.sent()).suites;
                            assert.deepEqual(suites[0].children[0].browsers[0], {
                                name: 'yabro',
                                result: mkTestResult({ status: FAIL, attempt: 1 }),
                                retries: [mkTestResult({ status: SUCCESS, attempt: 0 })]
                            });
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should add second success result even if it is already successed in tree', function () { return __awaiter(_this, void 0, void 0, function () {
                var srcDataSuites1, srcDataSuites2, initialData, dataCollection, suites;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            srcDataSuites1 = mkSuiteTree({
                                browsers: [mkBrowserResult({
                                        name: 'yabro',
                                        result: mkTestResult({ status: SUCCESS, attempt: 0 })
                                    })]
                            });
                            srcDataSuites2 = mkSuiteTree({
                                browsers: [mkBrowserResult({
                                        name: 'yabro',
                                        result: mkTestResult({ status: SUCCESS, attempt: 0 })
                                    })]
                            });
                            initialData = mkData_({ suites: [srcDataSuites1] });
                            dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                            return [4 /*yield*/, mkDataTree_(initialData).mergeWith(dataCollection)];
                        case 1:
                            suites = (_a.sent()).suites;
                            assert.deepEqual(suites[0].children[0].browsers[0], {
                                name: 'yabro',
                                result: mkTestResult({ status: SUCCESS, attempt: 1 }),
                                retries: [mkTestResult({ status: SUCCESS, attempt: 0 })]
                            });
                            return [2 /*return*/];
                    }
                });
            }); });
        });
    });
    describe('merge statistics data', function () {
        describe('from non-existent suite in tree', function () {
            [
                { statName: 'passed', status: SUCCESS },
                { statName: 'failed', status: FAIL },
                { statName: 'failed', status: ERROR },
                { statName: 'skipped', status: SKIPPED }
            ].forEach(function (_a) {
                var statName = _a.statName, status = _a.status;
                it("should increment \"total\" and \"" + statName + "\" if test result status is \"" + status + "\"", function () { return __awaiter(_this, void 0, void 0, function () {
                    var _a, srcDataSuites1, srcDataSuites2, initialData, dataCollection, result;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                srcDataSuites1 = mkSuiteTree({ suite: mkSuite({ suitePath: ['suite1'] }) });
                                srcDataSuites2 = mkSuiteTree({
                                    suite: mkSuite({ suitePath: ['suite2'] }),
                                    browsers: [mkBrowserResult({
                                            result: mkTestResult({ status: status })
                                        })]
                                });
                                initialData = mkData_((_a = { suites: [srcDataSuites1], total: 1 }, _a[statName] = 1, _a));
                                dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                                return [4 /*yield*/, mkDataTree_(initialData).mergeWith(dataCollection)];
                            case 1:
                                result = _b.sent();
                                assert.equal(result.total, 2);
                                assert.equal(result[statName], 2);
                                return [2 /*return*/];
                        }
                    });
                }); });
                it('should increment only "retries" if test retry status is "${status}"', function () { return __awaiter(_this, void 0, void 0, function () {
                    var _a, srcDataSuites1, srcDataSuites2, initialData, dataCollection, result;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                srcDataSuites1 = mkSuiteTree({ suite: mkSuite({ suitePath: ['suite1'] }) });
                                srcDataSuites2 = mkSuiteTree({
                                    suite: mkSuite({ suitePath: ['suite2'] }),
                                    browsers: [mkBrowserResult({
                                            retries: [mkTestResult({ status: status })]
                                        })]
                                });
                                initialData = mkData_((_a = { suites: [srcDataSuites1], total: 1 }, _a[statName] = 1, _a.retries = 0, _a));
                                dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                                return [4 /*yield*/, mkDataTree_(initialData).mergeWith(dataCollection)];
                            case 1:
                                result = _b.sent();
                                assert.equal(result.total, 1);
                                assert.equal(result[statName], 1);
                                assert.equal(result.retries, 1);
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
        });
        describe('from non-existent state in tree', function () {
            [
                { statName: 'passed', status: SUCCESS },
                { statName: 'failed', status: FAIL },
                { statName: 'failed', status: ERROR },
                { statName: 'skipped', status: SKIPPED }
            ].forEach(function (_a) {
                var statName = _a.statName, status = _a.status;
                it("should increment \"total\" and \"" + statName + "\" if test result status is \"" + status + "\"", function () { return __awaiter(_this, void 0, void 0, function () {
                    var _a, srcDataSuites1, srcDataSuites2, initialData, dataCollection, result;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                srcDataSuites1 = mkSuiteTree({
                                    suite: mkSuite({ suitePath: ['suite'] }),
                                    state: mkState({ suitePath: ['suite', 'state'] })
                                });
                                srcDataSuites2 = mkSuiteTree({
                                    suite: mkSuite({ suitePath: ['suite'] }),
                                    state: mkState({ suitePath: ['suite', 'state2'] }),
                                    browsers: [mkBrowserResult({
                                            result: mkTestResult({ status: status })
                                        })]
                                });
                                initialData = mkData_((_a = { suites: [srcDataSuites1], total: 1 }, _a[statName] = 1, _a));
                                dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                                return [4 /*yield*/, mkDataTree_(initialData).mergeWith(dataCollection)];
                            case 1:
                                result = _b.sent();
                                assert.equal(result.total, 2);
                                assert.equal(result[statName], 2);
                                return [2 /*return*/];
                        }
                    });
                }); });
                it('should increment only "retries" if test retry status is "${status}"', function () { return __awaiter(_this, void 0, void 0, function () {
                    var _a, srcDataSuites1, srcDataSuites2, initialData, dataCollection, result;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                srcDataSuites1 = mkSuiteTree({
                                    suite: mkSuite({ suitePath: ['suite'] }),
                                    state: mkState({ suitePath: ['suite', 'state'] })
                                });
                                srcDataSuites2 = mkSuiteTree({
                                    suite: mkSuite({ suitePath: ['suite'] }),
                                    state: mkState({ suitePath: ['suite', 'state2'] }),
                                    browsers: [mkBrowserResult({
                                            retries: [mkTestResult({ status: status })]
                                        })]
                                });
                                initialData = mkData_((_a = { suites: [srcDataSuites1], total: 1 }, _a[statName] = 1, _a.retries = 0, _a));
                                dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                                return [4 /*yield*/, mkDataTree_(initialData).mergeWith(dataCollection)];
                            case 1:
                                result = _b.sent();
                                assert.equal(result.total, 1);
                                assert.equal(result[statName], 1);
                                assert.equal(result.retries, 1);
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
        });
        describe('from non-existent browser', function () {
            [
                { statName: 'passed', status: SUCCESS },
                { statName: 'failed', status: FAIL },
                { statName: 'failed', status: ERROR },
                { statName: 'skipped', status: SKIPPED }
            ].forEach(function (_a) {
                var statName = _a.statName, status = _a.status;
                it("should increment \"total\" and \"" + statName + "\" if test result status is \"" + status + "\"", function () { return __awaiter(_this, void 0, void 0, function () {
                    var _a, srcDataSuites1, srcDataSuites2, initialData, dataCollection, result;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                srcDataSuites1 = mkSuiteTree({
                                    suite: mkSuite({ suitePath: ['suite'] }),
                                    state: mkState({ suitePath: ['suite', 'state'] }),
                                    browsers: []
                                });
                                srcDataSuites2 = mkSuiteTree({
                                    suite: mkSuite({ suitePath: ['suite'] }),
                                    state: mkState({ suitePath: ['suite', 'state'] }),
                                    browsers: [mkBrowserResult({
                                            result: mkTestResult({ status: status })
                                        })]
                                });
                                initialData = mkData_((_a = { suites: [srcDataSuites1], total: 1 }, _a[statName] = 1, _a));
                                dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                                return [4 /*yield*/, mkDataTree_(initialData).mergeWith(dataCollection)];
                            case 1:
                                result = _b.sent();
                                assert.equal(result.total, 2);
                                assert.equal(result[statName], 2);
                                return [2 /*return*/];
                        }
                    });
                }); });
                it('should increment only "retries" if test retry status is "${status}"', function () { return __awaiter(_this, void 0, void 0, function () {
                    var _a, srcDataSuites1, srcDataSuites2, initialData, dataCollection, result;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                srcDataSuites1 = mkSuiteTree({
                                    suite: mkSuite({ suitePath: ['suite'] }),
                                    state: mkState({ suitePath: ['suite', 'state'] }),
                                    browsers: []
                                });
                                srcDataSuites2 = mkSuiteTree({
                                    suite: mkSuite({ suitePath: ['suite'] }),
                                    state: mkState({ suitePath: ['suite', 'state'] }),
                                    browsers: [mkBrowserResult({
                                            retries: [mkTestResult({ status: status })]
                                        })]
                                });
                                initialData = mkData_((_a = { suites: [srcDataSuites1], total: 1 }, _a[statName] = 1, _a.retries = 0, _a));
                                dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                                return [4 /*yield*/, mkDataTree_(initialData).mergeWith(dataCollection)];
                            case 1:
                                result = _b.sent();
                                assert.equal(result.total, 1);
                                assert.equal(result[statName], 1);
                                assert.equal(result.retries, 1);
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
        });
        describe('from existent browser', function () {
            var srcDataSuites1, srcDataSuites2;
            describe('if current result in tree and source report are not successful', function () {
                beforeEach(function () {
                    srcDataSuites1 = mkSuiteTree({
                        browsers: [mkBrowserResult({
                                name: 'yabro',
                                result: mkTestResult({ status: SKIPPED })
                            })]
                    });
                    srcDataSuites2 = mkSuiteTree({
                        browsers: [mkBrowserResult({
                                name: 'yabro',
                                result: mkTestResult({ status: FAIL }),
                                retries: [mkTestResult({ status: FAIL })]
                            })]
                    });
                });
                it('should change current status', function () { return __awaiter(_this, void 0, void 0, function () {
                    var initialData, dataCollection, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                initialData = mkData_({ suites: [srcDataSuites1], total: 1, skipped: 1, failed: 0 });
                                dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                                return [4 /*yield*/, mkDataTree_(initialData).mergeWith(dataCollection)];
                            case 1:
                                result = _a.sent();
                                assert.equal(result.total, 1);
                                assert.equal(result.skipped, 0);
                                assert.equal(result.failed, 1);
                                return [2 /*return*/];
                        }
                    });
                }); });
                it('should increment "retries" by current result and retries from source report', function () { return __awaiter(_this, void 0, void 0, function () {
                    var initialData, dataCollection, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                initialData = mkData_({ suites: [srcDataSuites1], total: 1, retries: 0 });
                                dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                                return [4 /*yield*/, mkDataTree_(initialData).mergeWith(dataCollection)];
                            case 1:
                                result = _a.sent();
                                assert.equal(result.total, 1);
                                assert.equal(result.retries, 2);
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
            describe('if current result in tree is successful', function () {
                beforeEach(function () {
                    srcDataSuites1 = mkSuiteTree({
                        browsers: [mkBrowserResult({
                                name: 'yabro',
                                result: mkTestResult({ status: SUCCESS })
                            })]
                    });
                    srcDataSuites2 = mkSuiteTree({
                        browsers: [mkBrowserResult({
                                name: 'yabro',
                                result: mkTestResult({ status: FAIL }),
                                retries: [mkTestResult({ status: FAIL })]
                            })]
                    });
                });
                it('should change current status', function () { return __awaiter(_this, void 0, void 0, function () {
                    var initialData, dataCollection, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                initialData = mkData_({ suites: [srcDataSuites1], total: 1, passed: 1, failed: 0 });
                                dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                                return [4 /*yield*/, mkDataTree_(initialData).mergeWith(dataCollection)];
                            case 1:
                                result = _a.sent();
                                assert.equal(result.total, 1);
                                assert.equal(result.passed, 0);
                                assert.equal(result.failed, 1);
                                return [2 /*return*/];
                        }
                    });
                }); });
                it('should increment "retries" by current result and retries from source report', function () { return __awaiter(_this, void 0, void 0, function () {
                    var initialData, dataCollection, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                initialData = mkData_({ suites: [srcDataSuites1], total: 1, retries: 0 });
                                dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                                return [4 /*yield*/, mkDataTree_(initialData).mergeWith(dataCollection)];
                            case 1:
                                result = _a.sent();
                                assert.equal(result.total, 1);
                                assert.equal(result.retries, 2);
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
            describe('if current result in tree and source report are successful', function () {
                it('should increment "retries" by current result from source report', function () { return __awaiter(_this, void 0, void 0, function () {
                    var srcDataSuites1, srcDataSuites2, initialData, dataCollection, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                srcDataSuites1 = mkSuiteTree({
                                    browsers: [mkBrowserResult({
                                            name: 'yabro',
                                            result: mkTestResult({ status: SUCCESS })
                                        })]
                                });
                                srcDataSuites2 = mkSuiteTree({
                                    browsers: [mkBrowserResult({
                                            name: 'yabro',
                                            result: mkTestResult({ status: SUCCESS })
                                        })]
                                });
                                initialData = mkData_({ suites: [srcDataSuites1], total: 1, passed: 1, retries: 0 });
                                dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                                return [4 /*yield*/, mkDataTree_(initialData).mergeWith(dataCollection)];
                            case 1:
                                result = _a.sent();
                                assert.equal(result.total, 1);
                                assert.equal(result.passed, 1);
                                assert.equal(result.retries, 1);
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
        });
    });
    describe('move images', function () {
        it('should not move image specified in "refImagePath"', function () { return __awaiter(_this, void 0, void 0, function () {
            var srcDataSuites1, srcDataSuites2, initialData, dataCollection;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        srcDataSuites1 = mkSuiteTree();
                        srcDataSuites2 = mkSuiteTree({
                            browsers: [mkBrowserResult({
                                    name: 'yabro',
                                    result: mkTestResult({ imagesInfo: [{ refImagePath: 'screens/yabro/stateName.png' }] })
                                })]
                        });
                        initialData = mkData_({ suites: [srcDataSuites1] });
                        dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                        return [4 /*yield*/, mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection)];
                    case 1:
                        _a.sent();
                        assert.neverCalledWith(fs.moveAsync, path.resolve('src-report/path', 'screens/yabro/stateName.png'), path.resolve('dest-report/path', 'screens/yabro/stateName.png'));
                        return [2 /*return*/];
                }
            });
        }); });
        [
            { keyName: 'actualPath', imgPaths: ['images/yabro~current_0.png', 'images/yabro~current_1.png'] },
            { keyName: 'expectedPath', imgPaths: ['images/yabro~ref_0.png', 'images/yabro~ref_1.png'] },
            { keyName: 'diffPath', imgPaths: ['images/yabro~diff_0.png', 'images/yabro~diff_1.png'] }
        ].forEach(function (_a) {
            var keyName = _a.keyName, imgPaths = _a.imgPaths;
            it("should move image specified in \"" + keyName + "\" field", function () { return __awaiter(_this, void 0, void 0, function () {
                var _a, _b, srcDataSuites1, srcDataSuites2, initialData, dataCollection;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            srcDataSuites1 = mkSuiteTree();
                            srcDataSuites2 = mkSuiteTree({
                                browsers: [mkBrowserResult({
                                        name: 'yabro',
                                        result: mkTestResult({ imagesInfo: [(_a = {}, _a[keyName] = imgPaths[1], _a)] }),
                                        retries: [mkTestResult({ imagesInfo: [(_b = {}, _b[keyName] = imgPaths[0], _b)] })]
                                    })]
                            });
                            initialData = mkData_({ suites: [srcDataSuites1] });
                            dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                            return [4 /*yield*/, mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection)];
                        case 1:
                            _c.sent();
                            imgPaths.forEach(function (imgPath) {
                                assert.calledWith(fs.moveAsync, path.resolve('src-report/path', imgPath), path.resolve('dest-report/path', imgPath));
                            });
                            return [2 /*return*/];
                    }
                });
            }); });
        });
        it('should move images from non-existent suite in tree', function () { return __awaiter(_this, void 0, void 0, function () {
            var srcDataSuites1, srcDataSuites2, initialData, dataCollection;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        srcDataSuites1 = mkSuiteTree({ suite: mkSuite({ suitePath: ['suite1'] }) });
                        srcDataSuites2 = mkSuiteTree({
                            suite: mkSuite({ suitePath: ['suite2'] }),
                            state: mkState({ suitePath: ['suite2', 'state'] }),
                            browsers: [mkBrowserResult({
                                    name: 'yabro',
                                    result: mkTestResult({ imagesInfo: [{ actualPath: 'images/yabro~current_1.png' }] }),
                                    retries: [mkTestResult({ imagesInfo: [{ actualPath: 'images/yabro~current_0.png' }] })]
                                })]
                        });
                        initialData = mkData_({ suites: [srcDataSuites1] });
                        dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                        return [4 /*yield*/, mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection)];
                    case 1:
                        _a.sent();
                        [0, 1].forEach(function (attempt) {
                            assert.calledWith(fs.moveAsync, path.resolve('src-report/path', "images/yabro~current_" + attempt + ".png"), path.resolve('dest-report/path', "images/yabro~current_" + attempt + ".png"));
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('should move images from non-existent state', function () { return __awaiter(_this, void 0, void 0, function () {
            var srcDataSuites1, srcDataSuites2, initialData, dataCollection;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        srcDataSuites1 = mkSuiteTree({
                            suite: mkSuite({ suitePath: ['suite'] }),
                            state: mkState({ suitePath: ['suite', 'state'] })
                        });
                        srcDataSuites2 = mkSuiteTree({
                            suite: mkSuite({ suitePath: ['suite'] }),
                            state: mkState({ suitePath: ['suite', 'state2'] }),
                            browsers: [mkBrowserResult({
                                    name: 'yabro',
                                    result: mkTestResult({ imagesInfo: [{ actualPath: 'images/yabro~current_1.png' }] }),
                                    retries: [mkTestResult({ imagesInfo: [{ actualPath: 'images/yabro~current_0.png' }] })]
                                })]
                        });
                        initialData = mkData_({ suites: [srcDataSuites1] });
                        dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                        return [4 /*yield*/, mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection)];
                    case 1:
                        _a.sent();
                        [0, 1].forEach(function (attempt) {
                            assert.calledWith(fs.moveAsync, path.resolve('src-report/path', "images/yabro~current_" + attempt + ".png"), path.resolve('dest-report/path', "images/yabro~current_" + attempt + ".png"));
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        it('should move images from non-existent browser', function () { return __awaiter(_this, void 0, void 0, function () {
            var srcDataSuites1, srcDataSuites2, initialData, dataCollection;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        srcDataSuites1 = mkSuiteTree({
                            suite: mkSuite({ suitePath: ['suite'] }),
                            state: mkState({ suitePath: ['suite', 'state'] }),
                            browsers: []
                        });
                        srcDataSuites2 = mkSuiteTree({
                            suite: mkSuite({ suitePath: ['suite'] }),
                            state: mkState({ suitePath: ['suite', 'state'] }),
                            browsers: [mkBrowserResult({
                                    name: 'yabro',
                                    result: mkTestResult({ imagesInfo: [{ actualPath: 'images/yabro~current_1.png' }] }),
                                    retries: [mkTestResult({ imagesInfo: [{ actualPath: 'images/yabro~current_0.png' }] })]
                                })]
                        });
                        initialData = mkData_({ suites: [srcDataSuites1] });
                        dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                        return [4 /*yield*/, mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection)];
                    case 1:
                        _a.sent();
                        [0, 1].forEach(function (attempt) {
                            assert.calledWith(fs.moveAsync, path.resolve('src-report/path', "images/yabro~current_" + attempt + ".png"), path.resolve('dest-report/path', "images/yabro~current_" + attempt + ".png"));
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        describe('from existent browser tree with modified attempt value in images', function () {
            it('should move images of success result if it is already successed in first report', function () { return __awaiter(_this, void 0, void 0, function () {
                var srcDataSuites1, srcDataSuites2, initialData, dataCollection;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            srcDataSuites1 = mkSuiteTree({
                                browsers: [mkBrowserResult({
                                        name: 'yabro',
                                        result: mkTestResult({ status: SUCCESS })
                                    })]
                            });
                            srcDataSuites2 = mkSuiteTree({
                                browsers: [mkBrowserResult({
                                        name: 'yabro',
                                        result: mkTestResult({
                                            status: SUCCESS,
                                            imagesInfo: [{ actualPath: 'images/yabro~current_0.png' }]
                                        })
                                    })]
                            });
                            initialData = mkData_({ suites: [srcDataSuites1] });
                            dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                            return [4 /*yield*/, mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection)];
                        case 1:
                            _a.sent();
                            assert.calledOnceWith(fs.moveAsync, path.resolve('src-report/path', 'images/yabro~current_0.png'), path.resolve('dest-report/path', 'images/yabro~current_1.png'));
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should move images if there are no successful tests', function () { return __awaiter(_this, void 0, void 0, function () {
                var srcDataSuites1, srcDataSuites2, initialData, dataCollection;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            srcDataSuites1 = mkSuiteTree({
                                browsers: [mkBrowserResult({
                                        name: 'yabro',
                                        result: mkTestResult()
                                    })]
                            });
                            srcDataSuites2 = mkSuiteTree({
                                browsers: [mkBrowserResult({
                                        name: 'yabro',
                                        result: mkTestResult({ imagesInfo: [{ actualPath: 'images/yabro~current_0.png' }] })
                                    })]
                            });
                            initialData = mkData_({ suites: [srcDataSuites1] });
                            dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                            return [4 /*yield*/, mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection)];
                        case 1:
                            _a.sent();
                            assert.calledWith(fs.moveAsync, path.resolve('src-report/path', "images/yabro~current_0.png"), path.resolve('dest-report/path', "images/yabro~current_1.png"));
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should move images if there are no successful tests with retries', function () { return __awaiter(_this, void 0, void 0, function () {
                var srcDataSuites1, srcDataSuites2, initialData, dataCollection;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            srcDataSuites1 = mkSuiteTree({
                                browsers: [mkBrowserResult({
                                        name: 'yabro',
                                        result: mkTestResult()
                                    })]
                            });
                            srcDataSuites2 = mkSuiteTree({
                                browsers: [mkBrowserResult({
                                        name: 'yabro',
                                        result: mkTestResult({ imagesInfo: [{ actualPath: 'images/yabro~current_1.png' }] }),
                                        retries: [mkTestResult({ imagesInfo: [{ actualPath: 'images/yabro~current_0.png' }] })]
                                    })]
                            });
                            initialData = mkData_({ suites: [srcDataSuites1] });
                            dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                            return [4 /*yield*/, mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection)];
                        case 1:
                            _a.sent();
                            [0, 1].forEach(function (attempt) {
                                assert.calledWith(fs.moveAsync, path.resolve('src-report/path', "images/yabro~current_" + attempt + ".png"), path.resolve('dest-report/path', "images/yabro~current_" + (attempt + 1) + ".png"));
                            });
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should move images if there is successful test in first report', function () { return __awaiter(_this, void 0, void 0, function () {
                var srcDataSuites1, srcDataSuites2, initialData, dataCollection;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            srcDataSuites1 = mkSuiteTree({
                                browsers: [mkBrowserResult({
                                        name: 'yabro',
                                        result: mkTestResult({
                                            status: SUCCESS,
                                            imagesInfo: [{ actualPath: 'images/yabro~current_0.png' }]
                                        })
                                    })]
                            });
                            srcDataSuites2 = mkSuiteTree({
                                browsers: [mkBrowserResult({
                                        name: 'yabro',
                                        result: mkTestResult({ imagesInfo: [{ actualPath: 'images/yabro~current_0.png' }] })
                                    })]
                            });
                            initialData = mkData_({ suites: [srcDataSuites1] });
                            dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                            return [4 /*yield*/, mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection)];
                        case 1:
                            _a.sent();
                            assert.calledWith(fs.moveAsync, path.resolve('src-report/path', "images/yabro~current_0.png"), path.resolve('dest-report/path', "images/yabro~current_1.png"));
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should move images if there is successful test in first report with retries', function () { return __awaiter(_this, void 0, void 0, function () {
                var srcDataSuites1, srcDataSuites2, initialData, dataCollection;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            srcDataSuites1 = mkSuiteTree({
                                browsers: [mkBrowserResult({
                                        name: 'yabro',
                                        result: mkTestResult({ status: SUCCESS, imagesInfo: [{ actualPath: 'images/yabro~current_1.png' }] }),
                                        retries: [mkTestResult()]
                                    })]
                            });
                            srcDataSuites2 = mkSuiteTree({
                                browsers: [mkBrowserResult({
                                        name: 'yabro',
                                        result: mkTestResult({ imagesInfo: [{ actualPath: 'images/yabro~current_1.png' }] }),
                                        retries: [mkTestResult({ imagesInfo: [{ actualPath: 'images/yabro~current_0.png' }] })]
                                    })]
                            });
                            initialData = mkData_({ suites: [srcDataSuites1] });
                            dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                            return [4 /*yield*/, mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection)];
                        case 1:
                            _a.sent();
                            [0, 1].forEach(function (attempt) {
                                assert.calledWith(fs.moveAsync, path.resolve('src-report/path', "images/yabro~current_" + attempt + ".png"), path.resolve('dest-report/path', "images/yabro~current_" + (attempt + 2) + ".png"));
                            });
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should move images if there is successful test in source report', function () { return __awaiter(_this, void 0, void 0, function () {
                var srcDataSuites1, srcDataSuites2, initialData, dataCollection;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            srcDataSuites1 = mkSuiteTree({
                                browsers: [mkBrowserResult({
                                        name: 'yabro',
                                        result: mkTestResult()
                                    })]
                            });
                            srcDataSuites2 = mkSuiteTree({
                                browsers: [mkBrowserResult({
                                        name: 'yabro',
                                        result: mkTestResult({
                                            status: SUCCESS,
                                            imagesInfo: [{ actualPath: 'images/yabro~current_0.png' }]
                                        })
                                    })]
                            });
                            initialData = mkData_({ suites: [srcDataSuites1] });
                            dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                            return [4 /*yield*/, mkDataTree_(initialData, 'dest-report/path').mergeWith(dataCollection)];
                        case 1:
                            _a.sent();
                            assert.calledWith(fs.moveAsync, path.resolve('src-report/path', 'images/yabro~current_0.png'), path.resolve('dest-report/path', 'images/yabro~current_1.png'));
                            return [2 /*return*/];
                    }
                });
            }); });
        });
        it('should change suite status if current result in tree is not successful', function () { return __awaiter(_this, void 0, void 0, function () {
            var srcDataSuites1, srcDataSuites2, initialData, dataCollection, suites;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        srcDataSuites1 = mkSuiteTree({
                            suite: mkSuite({ status: FAIL }),
                            state: mkState({ status: FAIL }),
                            browsers: [mkBrowserResult({
                                    name: 'yabro',
                                    result: mkTestResult({ status: FAIL, attempt: 0 })
                                })]
                        });
                        srcDataSuites2 = mkSuiteTree({
                            browsers: [mkBrowserResult({
                                    name: 'yabro',
                                    result: mkTestResult({ status: SUCCESS, attempt: 0 })
                                })]
                        });
                        initialData = mkData_({ suites: [srcDataSuites1] });
                        dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                        return [4 /*yield*/, mkDataTree_(initialData).mergeWith(dataCollection)];
                    case 1:
                        suites = (_a.sent()).suites;
                        assert.equal(suites[0].status, SUCCESS);
                        assert.equal(suites[0].children[0].status, SUCCESS);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should not change suite status if current result in source report is skipped', function () { return __awaiter(_this, void 0, void 0, function () {
            var srcDataSuites1, srcDataSuites2, initialData, dataCollection, suites;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        srcDataSuites1 = mkSuiteTree({
                            suite: mkSuite({ status: SUCCESS }),
                            state: mkState({ status: SUCCESS }),
                            browsers: [mkBrowserResult({
                                    name: 'yabro',
                                    result: mkTestResult({ status: SUCCESS, attempt: 0 })
                                })]
                        });
                        srcDataSuites2 = mkSuiteTree({
                            browsers: [mkBrowserResult({
                                    name: 'yabro',
                                    result: mkTestResult({ status: SKIPPED, attempt: 0 })
                                })]
                        });
                        initialData = mkData_({ suites: [srcDataSuites1] });
                        dataCollection = { 'src-report/path': mkData_({ suites: [srcDataSuites2] }) };
                        return [4 /*yield*/, mkDataTree_(initialData).mergeWith(dataCollection)];
                    case 1:
                        suites = (_a.sent()).suites;
                        assert.equal(suites[0].status, SUCCESS);
                        assert.equal(suites[0].children[0].status, SUCCESS);
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
//# sourceMappingURL=data-tree.js.map