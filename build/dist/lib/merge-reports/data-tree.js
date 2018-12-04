"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var path_1 = tslib_1.__importDefault(require("path"));
var lodash_1 = tslib_1.__importDefault(require("lodash"));
// @ts-ignore
var bluebird_1 = tslib_1.__importDefault(require("bluebird"));
var fs = bluebird_1.default.promisifyAll(require('fs-extra'));
var isSkippedStatus = require('../common-utils').isSkippedStatus;
var _a = require('../static/modules/utils'), findNode = _a.findNode, setStatusForBranch = _a.setStatusForBranch;
var _b = require('./utils'), getDataFrom = _b.getDataFrom, getStatNameForStatus = _b.getStatNameForStatus, getImagePaths = _b.getImagePaths;
module.exports = /** @class */ (function () {
    function DataTree(
    // initialData
    _data, _destPath) {
        this._data = _data;
        this._destPath = _destPath;
    }
    DataTree.create = function (initialData, destPath) {
        return new DataTree(initialData, destPath);
    };
    DataTree.prototype.mergeWith = function (dataCollection) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // make it serially in order to perform correct merge/permutation of images and datas
                    return [4 /*yield*/, bluebird_1.default.each(lodash_1.default.toPairs(dataCollection), function (_a) {
                            var path = _a[0], data = _a[1];
                            return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                return tslib_1.__generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            this._srcPath = path;
                                            this._mergeSkips(data.skips);
                                            return [4 /*yield*/, this._mergeSuites(data.suites)];
                                        case 1:
                                            _b.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            });
                        })];
                    case 1:
                        // make it serially in order to perform correct merge/permutation of images and datas
                        _a.sent();
                        return [2 /*return*/, this._data];
                }
            });
        });
    };
    DataTree.prototype._mergeSkips = function (srcSkips) {
        var _this = this;
        srcSkips.forEach(function (skip) {
            if (!lodash_1.default.find(_this._data.skips, { suite: skip.suite, browser: skip.browser })) {
                _this._data.skips.push(skip);
            }
        });
    };
    DataTree.prototype._mergeSuites = function (srcSuites) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, bluebird_1.default.map(srcSuites, function (suite) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                            return tslib_1.__generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this._mergeSuiteResult(suite)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DataTree.prototype._mergeSuiteResult = function (suite) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var existentSuite;
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        existentSuite = findNode(this._data.suites, suite.suitePath);
                        if (!!existentSuite) return [3 /*break*/, 2];
                        return [4 /*yield*/, this._addSuiteResult(suite)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        if (!suite.children) return [3 /*break*/, 4];
                        return [4 /*yield*/, bluebird_1.default.map(suite.children, function (childSuite) { return _this._mergeSuiteResult(childSuite); })];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 4: return [4 /*yield*/, this._mergeBrowserResult(suite)];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    DataTree.prototype._mergeBrowserResult = function (suite) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, bluebird_1.default.map(suite.browsers || [], function (bro) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                            var existentBro;
                            return tslib_1.__generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        existentBro = this._findBrowserResult(suite.suitePath || '', bro.name);
                                        if (!!existentBro) return [3 /*break*/, 2];
                                        return [4 /*yield*/, this._addBrowserResult(bro, suite.suitePath || '')];
                                    case 1: return [2 /*return*/, _a.sent()];
                                    case 2:
                                        this._moveTestResultToRetries(existentBro);
                                        return [4 /*yield*/, this._addTestRetries(existentBro, bro.retries)];
                                    case 3:
                                        _a.sent();
                                        return [4 /*yield*/, this._changeTestResult(existentBro, bro.result, suite.suitePath || '')];
                                    case 4:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DataTree.prototype._addSuiteResult = function (suite) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var existentParentSuite;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (suite.suitePath && suite.suitePath.length === 1) {
                            this._data.suites.push(suite);
                        }
                        else {
                            existentParentSuite = findNode(this._data.suites, (suite.suitePath || '').slice(0, -1));
                            existentParentSuite.children.push(suite);
                        }
                        this._mergeStatistics(suite);
                        // @ts-ignore
                        return [4 /*yield*/, this._moveImages(suite, { fromFields: ['result', 'retries'] })];
                    case 1:
                        // @ts-ignore
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DataTree.prototype._addBrowserResult = function (bro, suitePath) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var existentParentSuite;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        existentParentSuite = findNode(this._data.suites, suitePath);
                        existentParentSuite.browsers.push(bro);
                        this._mergeStatistics(bro);
                        // @ts-ignore
                        return [4 /*yield*/, this._moveImages(bro, { fromFields: ['result', 'retries'] })];
                    case 1:
                        // @ts-ignore
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DataTree.prototype._moveTestResultToRetries = function (existentBro) {
        existentBro.retries.push(existentBro.result);
        this._data.retries += 1;
        var statName = getStatNameForStatus(existentBro.result.status);
        this._data[statName] -= 1;
    };
    DataTree.prototype._addTestRetries = function (existentBro, retries) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, bluebird_1.default.mapSeries(retries, function (retry) { return _this._addTestRetry(existentBro, retry); })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DataTree.prototype._addTestRetry = function (existentBro, retry) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var newAttempt;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        newAttempt = existentBro.retries.length;
                        // @ts-ignore
                        return [4 /*yield*/, this._moveImages(retry, { newAttempt: newAttempt })];
                    case 1:
                        // @ts-ignore
                        _a.sent();
                        retry = this._changeFieldsWithAttempt(retry, { newAttempt: newAttempt });
                        existentBro.retries.push(retry);
                        this._data.retries += 1;
                        return [2 /*return*/];
                }
            });
        });
    };
    DataTree.prototype._changeTestResult = function (existentBro, result, suitePath) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var statName;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // @ts-ignore
                    return [4 /*yield*/, this._moveImages(result, { newAttempt: existentBro.retries.length })];
                    case 1:
                        // @ts-ignore
                        _a.sent();
                        existentBro.result = this._changeFieldsWithAttempt(result, { newAttempt: existentBro.retries.length });
                        statName = getStatNameForStatus(existentBro.result.status);
                        this._data[statName] += 1;
                        if (!isSkippedStatus(existentBro.result.status)) {
                            setStatusForBranch(this._data.suites, suitePath, existentBro.result.status);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    DataTree.prototype._mergeStatistics = function (node) {
        var _this = this;
        var testResultStatuses = getDataFrom(node, { fieldName: 'status', fromFields: 'result' });
        testResultStatuses.forEach(function (testStatus) {
            var statName = getStatNameForStatus(testStatus);
            if (_this._data.hasOwnProperty(statName)) {
                _this._data.total += 1;
                _this._data[statName] += 1;
            }
        });
        var testRetryStatuses = getDataFrom(node, { fieldName: 'status', fromFields: 'retries' });
        this._data.retries += testRetryStatuses.length;
    };
    DataTree.prototype._moveImages = function (node, _a) {
        var newAttempt = _a.newAttempt, fromFields = _a.fromFields;
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, bluebird_1.default.map(getImagePaths(node, fromFields), function (imgPath) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                            var srcImgPath, destImgPath;
                            return tslib_1.__generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        srcImgPath = path_1.default.resolve(this._srcPath, imgPath);
                                        destImgPath = path_1.default.resolve(this._destPath, lodash_1.default.isNumber(newAttempt) ? imgPath.replace(/\d+(?=.png$)/, newAttempt) : imgPath);
                                        return [4 /*yield*/, fs.moveAsync(srcImgPath, destImgPath)];
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
    DataTree.prototype._changeFieldsWithAttempt = function (testResult, _a) {
        var newAttempt = _a.newAttempt;
        var imagesInfo = testResult.imagesInfo && testResult.imagesInfo.map(function (imageInfo) {
            return lodash_1.default.mapValues(imageInfo, function (val, key) {
                // @ts-ignore
                return ['expectedPath', 'actualPath', 'diffPath'].includes(key)
                    ? val.replace(/\d+(?=.png)/, newAttempt)
                    : val;
            });
        });
        return lodash_1.default.extend({}, testResult, { attempt: newAttempt, imagesInfo: imagesInfo });
    };
    DataTree.prototype._findBrowserResult = function (suitePath, browserId) {
        var existentNode = findNode(this._data.suites, suitePath);
        return lodash_1.default.find(lodash_1.default.get(existentNode, 'browsers'), { name: browserId });
    };
    return DataTree;
}());
//# sourceMappingURL=data-tree.js.map