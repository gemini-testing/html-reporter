"use strict";
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var axios_1 = tslib_1.__importDefault(require("axios"));
var lodash_1 = require("lodash");
var action_names_1 = tslib_1.__importDefault(require("./action-names"));
var _a = require('../../constants/test-statuses'), QUEUED = _a.QUEUED, UPDATED = _a.UPDATED;
var utils_1 = require("./utils");
exports.initial = function () {
    return function (dispatch) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
        var appState, e_1;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, axios_1.default.get('/init')];
                case 1:
                    appState = _a.sent();
                    dispatch({
                        type: action_names_1.default.VIEW_INITIAL,
                        payload: appState.data
                    });
                    return [3 /*break*/, 3];
                case 2:
                    e_1 = _a.sent();
                    console.error('Error while getting initial data:', e_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
};
var runTests = function (_a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.tests, tests = _c === void 0 ? [] : _c, _d = _b.action, action = _d === void 0 ? {} : _d;
    return function (dispatch) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
        var e_2;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, axios_1.default.post('/run', tests)];
                case 1:
                    _a.sent();
                    dispatch(action);
                    return [3 /*break*/, 3];
                case 2:
                    e_2 = _a.sent();
                    console.error('Error while running tests:', e_2);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
};
exports.runAllTests = function () {
    return runTests({ action: {
            type: action_names_1.default.RUN_ALL_TESTS,
            payload: { status: QUEUED }
        } });
};
exports.runFailedTests = function (fails, actionName) {
    if (actionName === void 0) { actionName = action_names_1.default.RUN_FAILED_TESTS; }
    fails = filterFailedBrowsers((new Array()).concat(fails));
    return runTests({ tests: fails, action: { type: actionName } });
};
exports.retrySuite = function (suite) {
    return runTests({ tests: [suite], action: { type: action_names_1.default.RETRY_SUITE } });
};
exports.retryTest = function (suite, browserId) {
    if (browserId === void 0) { browserId = null; }
    return exports.runFailedTests(lodash_1.assign({ browserId: browserId }, suite), action_names_1.default.RETRY_TEST);
};
exports.acceptAll = function (fails) {
    fails = filterAcceptableBrowsers([].concat(fails));
    var formattedFails = lodash_1.flatMap([].concat(fails), formatTests);
    return function (dispatch) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
        var updatedData, e_3;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, axios_1.default.post('/update-reference', lodash_1.compact(formattedFails))];
                case 1:
                    updatedData = (_a.sent()).data;
                    dispatch({ type: action_names_1.default.UPDATE_RESULT, payload: updatedData });
                    return [3 /*break*/, 3];
                case 2:
                    e_3 = _a.sent();
                    console.error('Error while updating references of failed tests:', e_3);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
};
exports.acceptTest = function (suite, browserId, attempt, stateName) {
    return exports.acceptAll(lodash_1.assign({ browserId: browserId, stateName: stateName }, suite, { acceptTestAttempt: attempt }));
};
exports.suiteBegin = function (suite) { return ({ type: action_names_1.default.SUITE_BEGIN, payload: suite }); };
exports.testBegin = function (test) { return ({ type: action_names_1.default.TEST_BEGIN, payload: test }); };
exports.testResult = function (result) { return ({ type: action_names_1.default.TEST_RESULT, payload: result }); };
exports.testsEnd = function () { return ({ type: action_names_1.default.TESTS_END }); };
exports.runFailed = function () { return ({ type: action_names_1.default.RUN_FAILED_TESTS }); };
exports.expandAll = function () { return ({ type: action_names_1.default.VIEW_EXPAND_ALL }); };
exports.expandErrors = function () { return ({ type: action_names_1.default.VIEW_EXPAND_ERRORS }); };
exports.expandRetries = function () { return ({ type: action_names_1.default.VIEW_EXPAND_RETRIES }); };
exports.collapseAll = function () { return ({ type: action_names_1.default.VIEW_COLLAPSE_ALL }); };
exports.toggleSkipped = function () { return ({ type: action_names_1.default.VIEW_TOGGLE_SKIPPED }); };
exports.toggleOnlyDiff = function () { return ({ type: action_names_1.default.VIEW_TOGGLE_ONLY_DIFF }); };
exports.toggleScaleImages = function () { return ({ type: action_names_1.default.VIEW_TOGGLE_SCALE_IMAGES }); };
exports.toggleLazyLoad = function () { return ({ type: action_names_1.default.VIEW_TOGGLE_LAZY_LOAD_IMAGES }); };
exports.updateBaseHost = function (host) {
    window.localStorage.setItem('_gemini-replace-host', host);
    return { type: action_names_1.default.VIEW_UPDATE_BASE_HOST, host: host };
};
function changeViewMode(mode) {
    switch (mode) {
        case 'failed':
            return { type: action_names_1.default.VIEW_SHOW_FAILED };
        default:
            return { type: action_names_1.default.VIEW_SHOW_ALL };
    }
}
exports.changeViewMode = changeViewMode;
function formatTests(test) {
    if (test.children) {
        return lodash_1.flatMap(test.children, formatTests);
    }
    if (test.browserId) {
        test.browsers = lodash_1.filter(test.browsers, { name: test.browserId });
    }
    var suitePath = test.suitePath, name = test.name, acceptTestAttempt = test.acceptTestAttempt;
    var prepareImages = function (images, filterCond) {
        return lodash_1.filter(images, filterCond)
            .filter(utils_1.isAcceptable)
            .map(function (_a) {
            var actualPath = _a.actualPath, stateName = _a.stateName;
            return ({ status: UPDATED, actualPath: actualPath, stateName: stateName });
        });
    };
    return lodash_1.flatMap(test.browsers, function (browser) {
        var browserResult = getBrowserResultByAttempt(browser, acceptTestAttempt);
        var imagesInfo;
        if (test.stateName) {
            imagesInfo = prepareImages(browserResult.imagesInfo, { stateName: test.stateName });
        }
        else {
            imagesInfo = prepareImages(browserResult.imagesInfo, 'actualPath');
        }
        var metaInfo = browserResult.metaInfo, attempt = browserResult.attempt;
        return imagesInfo.length && {
            suite: { path: suitePath.slice(0, -1) },
            state: { name: name },
            browserId: browser.name,
            metaInfo: metaInfo,
            imagesInfo: imagesInfo,
            attempt: attempt
        };
    });
}
function filterBrowsers(suites, filterFn) {
    if (suites === void 0) { suites = []; }
    var modifySuite = function (suite) {
        if (suite.children) {
            return lodash_1.flatMap(suite.children, modifySuite);
        }
        return lodash_1.set(suite, 'browsers', lodash_1.filter(suite.browsers, function (bro) {
            if (suite.browserId && suite.browserId !== bro.name) {
                return false;
            }
            var browserResult = getBrowserResultByAttempt(bro, suite.acceptTestAttempt);
            return filterFn(browserResult);
        }));
    };
    return lodash_1.flatMap(lodash_1.cloneDeep(suites), modifySuite);
}
function filterFailedBrowsers(suites) {
    if (suites === void 0) { suites = []; }
    return filterBrowsers(suites, utils_1.isSuiteFailed);
}
function filterAcceptableBrowsers(suites) {
    if (suites === void 0) { suites = []; }
    return filterBrowsers(suites, utils_1.isAcceptable);
}
function getBrowserResultByAttempt(browser, attempt) {
    return attempt >= 0
        ? browser.retries.concat(browser.result)[attempt]
        : browser.result;
}
//# sourceMappingURL=actions.js.map