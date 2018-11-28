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
var isSkippedStatus = require('../common-utils').isSkippedStatus;
var _a = require('../static/modules/utils'), findNode = _a.findNode, setStatusForBranch = _a.setStatusForBranch;
var _b = require('./utils'), getDataFrom = _b.getDataFrom, getStatNameForStatus = _b.getStatNameForStatus, getImagePaths = _b.getImagePaths;
module.exports = /** @class */ (function () {
    function DataTree(initialData, destPath) {
        this._data = initialData;
        this._destPath = destPath;
    }
    DataTree.create = function (initialData, destPath) {
        return new DataTree(initialData, destPath);
    };
    DataTree.prototype.mergeWith = function (dataCollection) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // make it serially in order to perform correct merge/permutation of images and datas
                    return [4 /*yield*/, Promise.each(_.toPairs(dataCollection), function (_a) {
                            var path = _a[0], data = _a[1];
                            return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_b) {
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
            if (!_.find(_this._data.skips, { suite: skip.suite, browser: skip.browser })) {
                _this._data.skips.push(skip);
            }
        });
    };
    DataTree.prototype._mergeSuites = function (srcSuites) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.map(srcSuites, function (suite) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
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
        return __awaiter(this, void 0, void 0, function () {
            var existentSuite;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        existentSuite = findNode(this._data.suites, suite.suitePath);
                        if (!!existentSuite) return [3 /*break*/, 2];
                        return [4 /*yield*/, this._addSuiteResult(suite)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        if (!suite.children) return [3 /*break*/, 4];
                        return [4 /*yield*/, Promise.map(suite.children, function (childSuite) { return _this._mergeSuiteResult(childSuite); })];
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
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.map(suite.browsers, function (bro) { return __awaiter(_this, void 0, void 0, function () {
                            var existentBro;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        existentBro = this._findBrowserResult(suite.suitePath, bro.name);
                                        if (!!existentBro) return [3 /*break*/, 2];
                                        return [4 /*yield*/, this._addBrowserResult(bro, suite.suitePath)];
                                    case 1: return [2 /*return*/, _a.sent()];
                                    case 2:
                                        this._moveTestResultToRetries(existentBro);
                                        return [4 /*yield*/, this._addTestRetries(existentBro, bro.retries)];
                                    case 3:
                                        _a.sent();
                                        return [4 /*yield*/, this._changeTestResult(existentBro, bro.result, suite.suitePath)];
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
        return __awaiter(this, void 0, void 0, function () {
            var existentParentSuite;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (suite.suitePath.length === 1) {
                            this._data.suites.push(suite);
                        }
                        else {
                            existentParentSuite = findNode(this._data.suites, suite.suitePath.slice(0, -1));
                            existentParentSuite.children.push(suite);
                        }
                        this._mergeStatistics(suite);
                        return [4 /*yield*/, this._moveImages(suite, { fromFields: ['result', 'retries'] })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DataTree.prototype._addBrowserResult = function (bro, suitePath) {
        return __awaiter(this, void 0, void 0, function () {
            var existentParentSuite;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        existentParentSuite = findNode(this._data.suites, suitePath);
                        existentParentSuite.browsers.push(bro);
                        this._mergeStatistics(bro);
                        return [4 /*yield*/, this._moveImages(bro, { fromFields: ['result', 'retries'] })];
                    case 1:
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
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.mapSeries(retries, function (retry) { return _this._addTestRetry(existentBro, retry); })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DataTree.prototype._addTestRetry = function (existentBro, retry) {
        return __awaiter(this, void 0, void 0, function () {
            var newAttempt;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        newAttempt = existentBro.retries.length;
                        return [4 /*yield*/, this._moveImages(retry, { newAttempt: newAttempt })];
                    case 1:
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
        return __awaiter(this, void 0, void 0, function () {
            var statName;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._moveImages(result, { newAttempt: existentBro.retries.length })];
                    case 1:
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
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.map(getImagePaths(node, fromFields), function (imgPath) { return __awaiter(_this, void 0, void 0, function () {
                            var srcImgPath, destImgPath;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        srcImgPath = path.resolve(this._srcPath, imgPath);
                                        destImgPath = path.resolve(this._destPath, _.isNumber(newAttempt) ? imgPath.replace(/\d+(?=.png$)/, newAttempt) : imgPath);
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
        var imagesInfo = testResult.imagesInfo.map(function (imageInfo) {
            return _.mapValues(imageInfo, function (val, key) {
                return ['expectedPath', 'actualPath', 'diffPath'].includes(key)
                    ? val.replace(/\d+(?=.png)/, newAttempt)
                    : val;
            });
        });
        return _.extend({}, testResult, { attempt: newAttempt, imagesInfo: imagesInfo });
    };
    DataTree.prototype._findBrowserResult = function (suitePath, browserId) {
        var existentNode = findNode(this._data.suites, suitePath);
        return _.find(_.get(existentNode, 'browsers'), { name: browserId });
    };
    return DataTree;
}());
//# sourceMappingURL=data-tree.js.map