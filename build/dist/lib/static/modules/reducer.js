"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var url_1 = tslib_1.__importDefault(require("url"));
var action_names_1 = tslib_1.__importDefault(require("./action-names"));
var default_state_1 = tslib_1.__importDefault(require("./default-state"));
var lodash_1 = require("lodash");
var utils_1 = require("./utils");
var compiledData = window.data || default_state_1.default;
var localStorage = window.localStorage;
function getInitialState(compiledData) {
    var skips = compiledData.skips, suites = compiledData.suites, config = compiledData.config, total = compiledData.total, updated = compiledData.updated, passed = compiledData.passed, failed = compiledData.failed, skipped = compiledData.skipped, warned = compiledData.warned, retries = compiledData.retries, _a = compiledData.gui, gui = _a === void 0 ? false : _a;
    var formattedSuites = formatSuitesData(suites);
    return lodash_1.merge(default_state_1.default, {
        gui: gui,
        skips: skips,
        config: config,
        stats: { total: total, updated: updated, passed: passed, failed: failed, skipped: skipped, retries: retries, warned: warned },
        view: tslib_1.__assign({ viewMode: config.defaultView, scaleImages: config.scaleImages, lazyLoadOffset: config.lazyLoadOffset }, _loadBaseHost(config.baseHost, localStorage))
    }, formattedSuites);
}
function reducer(state, action) {
    if (state === void 0) { state = getInitialState(compiledData); }
    switch (action.type) {
        case action_names_1.default.VIEW_INITIAL: {
            var _a = action.payload, gui = _a.gui, autoRun = _a.autoRun, suites = _a.suites, skips = _a.skips, _b = _a.config, scaleImages = _b.scaleImages, lazyLoadOffset = _b.lazyLoadOffset;
            var formattedSuites = formatSuitesData(suites);
            return lodash_1.merge({}, state, { gui: gui, autoRun: autoRun, skips: skips, view: { scaleImages: scaleImages, lazyLoadOffset: lazyLoadOffset } }, formattedSuites);
        }
        case action_names_1.default.RUN_ALL_TESTS: {
            var suites = lodash_1.clone(state.suites);
            utils_1.setStatusToAll(suites, action.payload.status);
            return lodash_1.merge({}, state, { running: true, suites: suites }); // TODO: rewrite store on run all tests
        }
        case action_names_1.default.RUN_FAILED_TESTS:
        case action_names_1.default.RETRY_SUITE:
        case action_names_1.default.RETRY_TEST: {
            return lodash_1.assign(lodash_1.clone(state), { running: true });
        }
        case action_names_1.default.SUITE_BEGIN: {
            var suites = lodash_1.clone(state.suites);
            var _c = action.payload, suitePath = _c.suitePath, status_1 = _c.status;
            var test_1 = utils_1.findNode(suites, suitePath);
            if (test_1) {
                test_1.status = status_1;
                forceUpdateSuiteData(suites, test_1);
            }
            return lodash_1.assign({}, state, { suites: suites });
        }
        case action_names_1.default.TEST_BEGIN: {
            var suites = lodash_1.clone(state.suites);
            var _d = action.payload, suitePath = _d.suitePath, status_2 = _d.status, browserId_1 = _d.browserId;
            var test_2 = utils_1.findNode(suites, suitePath);
            if (test_2) {
                test_2.status = status_2;
                test_2.browsers.forEach(function (b) {
                    if (b.name === browserId_1) {
                        b.result.status = status_2;
                    }
                });
                forceUpdateSuiteData(suites, test_2);
            }
            return lodash_1.assign({}, state, { suites: suites });
        }
        case action_names_1.default.TESTS_END: {
            return lodash_1.assign(lodash_1.clone(state), { running: false });
        }
        case action_names_1.default.TEST_RESULT: {
            return addTestResult(state, action);
        }
        case action_names_1.default.UPDATE_RESULT: {
            return addTestResult(state, action);
        }
        case action_names_1.default.VIEW_EXPAND_ALL: {
            return _mutateStateView(state, { expand: 'all' });
        }
        case action_names_1.default.VIEW_EXPAND_ERRORS: {
            return _mutateStateView(state, { expand: 'errors' });
        }
        case action_names_1.default.VIEW_EXPAND_RETRIES: {
            return _mutateStateView(state, { expand: 'retries' });
        }
        case action_names_1.default.VIEW_COLLAPSE_ALL: {
            return _mutateStateView(state, { expand: 'none' });
        }
        case action_names_1.default.VIEW_SHOW_ALL: {
            return _mutateStateView(state, { viewMode: 'all', expand: 'errors' });
        }
        case action_names_1.default.VIEW_SHOW_FAILED: {
            return _mutateStateView(state, { viewMode: 'failed', expand: 'errors' });
        }
        case action_names_1.default.VIEW_TOGGLE_SKIPPED: {
            return _mutateStateView(state, { showSkipped: !state.view.showSkipped });
        }
        case action_names_1.default.VIEW_TOGGLE_ONLY_DIFF: {
            return _mutateStateView(state, { showOnlyDiff: !state.view.showOnlyDiff });
        }
        case action_names_1.default.VIEW_TOGGLE_SCALE_IMAGES: {
            return _mutateStateView(state, { scaleImages: !state.view.scaleImages });
        }
        case action_names_1.default.VIEW_TOGGLE_LAZY_LOAD_IMAGES: {
            return _mutateStateView(state, { lazyLoadOffset: state.view.lazyLoadOffset ? 0 : state.config.lazyLoadOffset });
        }
        case action_names_1.default.VIEW_UPDATE_BASE_HOST: {
            var baseHost = action.host;
            var parsedHost = _parseHost(baseHost);
            return _mutateStateView(state, { baseHost: baseHost, parsedHost: parsedHost });
        }
        default:
            return state;
    }
}
exports.default = reducer;
function addTestResult(state, action) {
    var suites = lodash_1.clone(state.suites);
    [].concat(action.payload).forEach(function (suite) {
        var suitePath = suite.suitePath, browserResult = suite.browserResult, browserId = suite.browserId;
        var test = utils_1.findNode(suites, suitePath);
        if (!test) {
            return;
        }
        test.browsers.forEach(function (b) {
            if (b.name === browserId) {
                Object.assign(b, browserResult);
            }
        });
        utils_1.setStatusForBranch(suites, suitePath, browserResult.result.status);
        forceUpdateSuiteData(suites, test);
    });
    var suiteIds = lodash_1.clone(state.suiteIds);
    lodash_1.assign(suiteIds, { failed: getFailedSuiteIds(suites) });
    return lodash_1.assign({}, state, { suiteIds: suiteIds, suites: suites });
}
function _mutateStateView(state, mutation) {
    var newView = lodash_1.clone(state.view);
    lodash_1.assign(newView, mutation);
    return lodash_1.assign(lodash_1.clone(state), { view: newView });
}
function _loadBaseHost(configuredHost, storage) {
    if (!storage) {
        return configuredHost;
    }
    var storageHost = storage.getItem('_gemini-replace-host');
    var baseHost = storageHost || configuredHost;
    var parsedHost = _parseHost(baseHost);
    return { baseHost: baseHost, parsedHost: parsedHost };
}
function _parseHost(baseHost) {
    var parsedHost = url_1.default.parse(baseHost, false, true);
    return {
        host: parsedHost.slashes ? parsedHost.host : baseHost,
        protocol: parsedHost.slashes ? parsedHost.protocol : null,
        hostname: null,
        port: null
    };
}
function formatSuitesData(suites) {
    if (suites === void 0) { suites = []; }
    return {
        suites: lodash_1.reduce(suites, function (acc, s) {
            acc[getSuiteId(s)] = s;
            return acc;
        }, {}),
        suiteIds: {
            all: getSuiteIds(suites),
            failed: getFailedSuiteIds(suites)
        }
    };
}
function getFailedSuiteIds(suites) {
    // @ts-ignore
    return getSuiteIds(lodash_1.filter(suites, utils_1.isSuiteFailed));
}
function getSuiteIds(suites) {
    if (suites === void 0) { suites = []; }
    return lodash_1.map(suites, getSuiteId);
}
function getSuiteId(suite) {
    return suite.suitePath[0];
}
/*
 *  To re-render suite we need to change object reference because of shallow data comparing
 */
function forceUpdateSuiteData(suites, test) {
    var id = getSuiteId(test);
    suites[id] = lodash_1.cloneDeep(suites[id]);
}
//# sourceMappingURL=reducer.js.map