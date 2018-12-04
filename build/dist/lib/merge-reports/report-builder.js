"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var path_1 = tslib_1.__importDefault(require("path"));
var lodash_1 = tslib_1.__importDefault(require("lodash"));
// @ts-ignore
var bluebird_1 = tslib_1.__importDefault(require("bluebird"));
var fs = bluebird_1.default.promisifyAll(require('fs-extra'));
var chalk_1 = tslib_1.__importDefault(require("chalk"));
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
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var srcReportsData, dataTree, srcDataCollection, mergedData;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, moveContentToReportDir({ from: this.srcPaths[0], to: this.destPath })];
                    case 1:
                        _a.sent();
                        srcReportsData = this._loadReportsData();
                        dataTree = DataTree.create(srcReportsData[0], this.destPath);
                        srcDataCollection = lodash_1.default.zipObject(this.srcPaths.slice(1), srcReportsData.slice(1));
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
        return lodash_1.default(this.srcPaths)
            .map(function (reportPath) {
            var srcDataPath = path_1.default.resolve(reportPath, 'data');
            try {
                return serverUtils.require(srcDataPath);
            }
            catch (err) {
                serverUtils.logger.warn(chalk_1.default.yellow("Not found data file in passed source report path: " + reportPath));
                return { skips: [], suites: [] };
            }
        })
            .value();
    };
    ReportBuilder.prototype._copyToReportDir = function (files, _a) {
        var from = _a.from, to = _a.to;
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, bluebird_1.default.map(files, function (dataName) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                            var srcDataPath, destDataPath;
                            return tslib_1.__generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        srcDataPath = path_1.default.resolve(from, dataName);
                                        destDataPath = path_1.default.resolve(to, dataName);
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
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var formattedData, destDataPath;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        formattedData = serverUtils.prepareCommonJSData(data);
                        destDataPath = path_1.default.resolve(this.destPath, 'data.js');
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
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var files;
        var _this = this;
        return tslib_1.__generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, fs.readdirAsync(path_1.default.resolve(from))];
                case 1:
                    files = _b.sent();
                    return [4 /*yield*/, bluebird_1.default.map(files, function (fileName) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                            var srcFilePath, destFilePath;
                            return tslib_1.__generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        if (fileName === 'data.js') {
                                            return [2 /*return*/];
                                        }
                                        srcFilePath = path_1.default.resolve(from, fileName);
                                        destFilePath = path_1.default.resolve(to, fileName);
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