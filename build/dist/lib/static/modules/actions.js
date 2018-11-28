'use strict';
var _this = this;
import * as tslib_1 from "tslib";
import axios from 'axios';
import { assign, filter, flatMap, set, cloneDeep, compact } from 'lodash';
import actionNames from './action-names';
import { QUEUED, UPDATED } from '../../constants/test-statuses';
import { isSuiteFailed, isAcceptable } from './utils';
export var initial = function () {
    return function (dispatch) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
        var appState, e_1;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, axios.get('/init')];
                case 1:
                    appState = _a.sent();
                    dispatch({
                        type: actionNames.VIEW_INITIAL,
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
                    return [4 /*yield*/, axios.post('/run', tests)];
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
export var runAllTests = function () {
    return runTests({ action: {
            type: actionNames.RUN_ALL_TESTS,
            payload: { status: QUEUED }
        } });
};
export var runFailedTests = function (fails, actionName) {
    if (actionName === void 0) { actionName = actionNames.RUN_FAILED_TESTS; }
    fails = filterFailedBrowsers([].concat(fails));
    return runTests({ tests: fails, action: { type: actionName } });
};
export var retrySuite = function (suite) {
    return runTests({ tests: [suite], action: { type: actionNames.RETRY_SUITE } });
};
export var retryTest = function (suite, browserId) {
    if (browserId === void 0) { browserId = null; }
    return runFailedTests(assign({ browserId: browserId }, suite), actionNames.RETRY_TEST);
};
export var acceptAll = function (fails) {
    fails = filterAcceptableBrowsers([].concat(fails));
    var formattedFails = flatMap([].concat(fails), formatTests);
    return function (dispatch) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
        var updatedData, e_3;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, axios.post('/update-reference', compact(formattedFails))];
                case 1:
                    updatedData = (_a.sent()).data;
                    dispatch({ type: actionNames.UPDATE_RESULT, payload: updatedData });
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
export var acceptTest = function (suite, browserId, attempt, stateName) {
    return acceptAll(assign({ browserId: browserId, stateName: stateName }, suite, { acceptTestAttempt: attempt }));
};
export var suiteBegin = function (suite) { return ({ type: actionNames.SUITE_BEGIN, payload: suite }); };
export var testBegin = function (test) { return ({ type: actionNames.TEST_BEGIN, payload: test }); };
export var testResult = function (result) { return ({ type: actionNames.TEST_RESULT, payload: result }); };
export var testsEnd = function () { return ({ type: actionNames.TESTS_END }); };
export var runFailed = function () { return ({ type: actionNames.RUN_FAILED_TESTS }); };
export var expandAll = function () { return ({ type: actionNames.VIEW_EXPAND_ALL }); };
export var expandErrors = function () { return ({ type: actionNames.VIEW_EXPAND_ERRORS }); };
export var expandRetries = function () { return ({ type: actionNames.VIEW_EXPAND_RETRIES }); };
export var collapseAll = function () { return ({ type: actionNames.VIEW_COLLAPSE_ALL }); };
export var toggleSkipped = function () { return ({ type: actionNames.VIEW_TOGGLE_SKIPPED }); };
export var toggleOnlyDiff = function () { return ({ type: actionNames.VIEW_TOGGLE_ONLY_DIFF }); };
export var toggleScaleImages = function () { return ({ type: actionNames.VIEW_TOGGLE_SCALE_IMAGES }); };
export var toggleLazyLoad = function () { return ({ type: actionNames.VIEW_TOGGLE_LAZY_LOAD_IMAGES }); };
export var updateBaseHost = function (host) {
    window.localStorage.setItem('_gemini-replace-host', host);
    return { type: actionNames.VIEW_UPDATE_BASE_HOST, host: host };
};
export function changeViewMode(mode) {
    switch (mode) {
        case 'failed':
            return { type: actionNames.VIEW_SHOW_FAILED };
        default:
            return { type: actionNames.VIEW_SHOW_ALL };
    }
}
function formatTests(test) {
    if (test.children) {
        return flatMap(test.children, formatTests);
    }
    if (test.browserId) {
        test.browsers = filter(test.browsers, { name: test.browserId });
    }
    var suitePath = test.suitePath, name = test.name, acceptTestAttempt = test.acceptTestAttempt;
    var prepareImages = function (images, filterCond) {
        return filter(images, filterCond)
            .filter(isAcceptable)
            .map(function (_a) {
            var actualPath = _a.actualPath, stateName = _a.stateName;
            return ({ status: UPDATED, actualPath: actualPath, stateName: stateName });
        });
    };
    return flatMap(test.browsers, function (browser) {
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
            return flatMap(suite.children, modifySuite);
        }
        return set(suite, 'browsers', filter(suite.browsers, function (bro) {
            if (suite.browserId && suite.browserId !== bro.name) {
                return false;
            }
            var browserResult = getBrowserResultByAttempt(bro, suite.acceptTestAttempt);
            return filterFn(browserResult);
        }));
    };
    return flatMap(cloneDeep(suites), modifySuite);
}
function filterFailedBrowsers(suites) {
    if (suites === void 0) { suites = []; }
    return filterBrowsers(suites, isSuiteFailed);
}
function filterAcceptableBrowsers(suites) {
    if (suites === void 0) { suites = []; }
    return filterBrowsers(suites, isAcceptable);
}
function getBrowserResultByAttempt(browser, attempt) {
    return attempt >= 0
        ? browser.retries.concat(browser.result)[attempt]
        : browser.result;
}
//# sourceMappingURL=actions.js.map