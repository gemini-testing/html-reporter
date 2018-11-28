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
var path = require('path');
var fs = require('fs-extra');
var ReportBuilder = require('lib/merge-reports/report-builder');
var DataTree = require('lib/merge-reports/data-tree');
var serverUtils = require('lib/server-utils');
describe('lib/merge-reports/report-builder', function () {
    var sandbox = sinon.sandbox.create();
    var buildReport_ = function (srcPaths, destPath) {
        if (destPath === void 0) { destPath = 'default-dest-report/path'; }
        return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, ReportBuilder.create(srcPaths, destPath).build()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    beforeEach(function () {
        sandbox.stub(serverUtils, 'require').returns({});
        sandbox.stub(serverUtils, 'prepareCommonJSData');
        sandbox.stub(serverUtils.logger, 'warn');
        sandbox.stub(fs, 'moveAsync');
        sandbox.stub(fs, 'writeFile');
        sandbox.stub(fs, 'readdirAsync').resolves([]);
        sandbox.stub(DataTree, 'create').returns(Object.create(DataTree.prototype));
        sandbox.stub(DataTree.prototype, 'mergeWith').resolves();
    });
    afterEach(function () { return sandbox.restore(); });
    it('should move contents of first source report to destination report', function () { return __awaiter(_this, void 0, void 0, function () {
        var srcFilePath, destFilePath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fs.readdirAsync.resolves(['file-path']);
                    srcFilePath = path.resolve('src-report/path-1', 'file-path');
                    destFilePath = path.resolve('dest-report/path', 'file-path');
                    return [4 /*yield*/, buildReport_(['src-report/path-1', 'src-report/path-2'], 'dest-report/path')];
                case 1:
                    _a.sent();
                    assert.calledWith(fs.moveAsync, srcFilePath, destFilePath, { overwrite: true });
                    return [2 /*return*/];
            }
        });
    }); });
    it('should not move "data.js" file from first source report to destinatino report', function () { return __awaiter(_this, void 0, void 0, function () {
        var srcDataPath, destPath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fs.readdirAsync.resolves(['file-path', 'data.js']);
                    srcDataPath = path.resolve('src-report/path-1', 'data.js');
                    destPath = path.resolve('dest-report/path');
                    return [4 /*yield*/, buildReport_(['src-report/path-1', 'src-report/path-2'], 'dest-report/path')];
                case 1:
                    _a.sent();
                    assert.neverCalledWith(fs.moveAsync, srcDataPath, destPath);
                    return [2 /*return*/];
            }
        });
    }); });
    it('should not fail if data file does not find in source report path', function () { return __awaiter(_this, void 0, void 0, function () {
        var srcDataPath1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    srcDataPath1 = path.resolve('src-report/path-1', 'data');
                    serverUtils.require.withArgs(srcDataPath1).throws(new Error('Cannot find module'));
                    return [4 /*yield*/, assert.isFulfilled(buildReport_(['src-report/path-1', 'src-report/path-2']))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('should log a warning that there is no data file in source report path', function () { return __awaiter(_this, void 0, void 0, function () {
        var srcDataPath1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    srcDataPath1 = path.resolve('src-report/path-1', 'data');
                    serverUtils.require.withArgs(srcDataPath1).throws(new Error('Cannot find module'));
                    return [4 /*yield*/, buildReport_(['src-report/path-1', 'src-report/path-2'])];
                case 1:
                    _a.sent();
                    assert.calledWithMatch(serverUtils.logger.warn, 'Not found data file in passed source report path: src-report/path-1');
                    return [2 /*return*/];
            }
        });
    }); });
    it('should read source data files from reports', function () { return __awaiter(_this, void 0, void 0, function () {
        var srcDataPath1, srcDataPath2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    srcDataPath1 = path.resolve('src-report/path-1', 'data');
                    srcDataPath2 = path.resolve('src-report/path-2', 'data');
                    return [4 /*yield*/, buildReport_(['src-report/path-1', 'src-report/path-2'])];
                case 1:
                    _a.sent();
                    assert.calledTwice(serverUtils.require);
                    assert.calledWith(serverUtils.require, srcDataPath1);
                    assert.calledWith(serverUtils.require, srcDataPath2);
                    return [2 /*return*/];
            }
        });
    }); });
    it('should create "DataTree" instance with passed data from first source path and destination path', function () { return __awaiter(_this, void 0, void 0, function () {
        var srcDataPath1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    srcDataPath1 = path.resolve('src-report/path-1', 'data');
                    serverUtils.require.withArgs(srcDataPath1).returns('report-data-1');
                    return [4 /*yield*/, buildReport_(['src-report/path-1', 'src-report/path-2'], 'dest-report/path')];
                case 1:
                    _a.sent();
                    assert.calledOnceWith(DataTree.create, 'report-data-1', 'dest-report/path');
                    return [2 /*return*/];
            }
        });
    }); });
    it('should merge datas with passed source data collection execept the first one', function () { return __awaiter(_this, void 0, void 0, function () {
        var srcDataPath2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    srcDataPath2 = path.resolve('src-report/path-2', 'data');
                    serverUtils.require.withArgs(srcDataPath2).returns('report-data-2');
                    return [4 /*yield*/, buildReport_(['src-report/path-1', 'src-report/path-2'])];
                case 1:
                    _a.sent();
                    assert.calledOnceWith(DataTree.prototype.mergeWith, { 'src-report/path-2': 'report-data-2' });
                    return [2 /*return*/];
            }
        });
    }); });
    it('should convert merged data to commonjs format', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    DataTree.prototype.mergeWith.resolves('merged-data');
                    return [4 /*yield*/, buildReport_(['src-report/path-1', 'src-report/path-2'])];
                case 1:
                    _a.sent();
                    assert.calledOnceWith(serverUtils.prepareCommonJSData, 'merged-data');
                    return [2 /*return*/];
            }
        });
    }); });
    it('should write merged data to destination report', function () { return __awaiter(_this, void 0, void 0, function () {
        var destDataPath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    serverUtils.prepareCommonJSData.returns('prepared-data');
                    return [4 /*yield*/, buildReport_(['src-report/path-1', 'src-report/path-2'], 'dest-report/path')];
                case 1:
                    _a.sent();
                    destDataPath = path.resolve('dest-report/path', 'data.js');
                    assert.calledOnceWith(fs.writeFile, destDataPath, 'prepared-data');
                    return [2 /*return*/];
            }
        });
    }); });
});
//# sourceMappingURL=report-builder.js.map