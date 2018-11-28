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
var path = require('path');
var _ = require('lodash');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs-extra'));
var chalk = require('chalk');
var DataTree = require('./data-tree');
var serverUtils = require('../server-utils');
module.exports = /** @class */ (function () {
    function ReportBuilder(srcPaths, destPath) {
        this.srcPaths = srcPaths;
        this.destPath = destPath;
    }
    ReportBuilder.create = function (srcPaths, destPath) {
        return new this(srcPaths, destPath);
    };
    ReportBuilder.prototype.build = function () {
        return __awaiter(this, void 0, void 0, function () {
            var srcReportsData, dataTree, srcDataCollection, mergedData;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, moveContentToReportDir({ from: this.srcPaths[0], to: this.destPath })];
                    case 1:
                        _a.sent();
                        srcReportsData = this._loadReportsData();
                        dataTree = DataTree.create(srcReportsData[0], this.destPath);
                        srcDataCollection = _.zipObject(this.srcPaths.slice(1), srcReportsData.slice(1));
                        return [4 /*yield*/, dataTree.mergeWith(srcDataCollection)];
                    case 2:
                        mergedData = _a.sent();
                        return [4 /*yield*/, this._saveDataFile(mergedData)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ReportBuilder.prototype._loadReportsData = function () {
        return _(this.srcPaths)
            .map(function (reportPath) {
            var srcDataPath = path.resolve(reportPath, 'data');
            try {
                return serverUtils.require(srcDataPath);
            }
            catch (err) {
                serverUtils.logger.warn(chalk.yellow("Not found data file in passed source report path: " + reportPath));
                return { skips: [], suites: [] };
            }
        })
            .value();
    };
    ReportBuilder.prototype._copyToReportDir = function (files, _a) {
        var from = _a.from, to = _a.to;
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.map(files, function (dataName) { return __awaiter(_this, void 0, void 0, function () {
                            var srcDataPath, destDataPath;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        srcDataPath = path.resolve(from, dataName);
                                        destDataPath = path.resolve(to, dataName);
                                        return [4 /*yield*/, fs.moveAsync(srcDataPath, destDataPath)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                    case 1:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ReportBuilder.prototype._saveDataFile = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var formattedData, destDataPath;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        formattedData = serverUtils.prepareCommonJSData(data);
                        destDataPath = path.resolve(this.destPath, 'data.js');
                        return [4 /*yield*/, fs.writeFile(destDataPath, formattedData)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return ReportBuilder;
}());
function moveContentToReportDir(_a) {
    var from = _a.from, to = _a.to;
    return __awaiter(this, void 0, void 0, function () {
        var files;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, fs.readdirAsync(path.resolve(from))];
                case 1:
                    files = _b.sent();
                    return [4 /*yield*/, Promise.map(files, function (fileName) { return __awaiter(_this, void 0, void 0, function () {
                            var srcFilePath, destFilePath;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        if (fileName === 'data.js') {
                                            return [2 /*return*/];
                                        }
                                        srcFilePath = path.resolve(from, fileName);
                                        destFilePath = path.resolve(to, fileName);
                                        return [4 /*yield*/, fs.moveAsync(srcFilePath, destFilePath, { overwrite: true })];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 2:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
//# sourceMappingURL=report-builder.js.map