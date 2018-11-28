'use strict';
import * as tslib_1 from "tslib";
import url from 'url';
import actionNames from './action-names';
import defaultState from './default-state';
import { assign, merge, filter, map, clone, cloneDeep, reduce } from 'lodash';
import { isSuiteFailed, setStatusToAll, findNode, setStatusForBranch } from './utils';
var compiledData = window.data || defaultState;
var localStorage = window.localStorage;
function getInitialState(compiledData) {
    var skips = compiledData.skips, suites = compiledData.suites, config = compiledData.config, total = compiledData.total, updated = compiledData.updated, passed = compiledData.passed, failed = compiledData.failed, skipped = compiledData.skipped, warned = compiledData.warned, retries = compiledData.retries, _a = compiledData.gui, gui = _a === void 0 ? false : _a;
    var formattedSuites = formatSuitesData(suites);
    return merge(defaultState, {
        gui: gui,
        skips: skips,
        config: config,
        stats: { total: total, updated: updated, passed: passed, failed: failed, skipped: skipped, retries: retries, warned: warned },
        view: tslib_1.__assign({ viewMode: config.defaultView, scaleImages: config.scaleImages, lazyLoadOffset: config.lazyLoadOffset }, _loadBaseHost(config.baseHost, localStorage))
    }, formattedSuites);
}
export default function reducer(state, action) {
    if (state === void 0) { state = getInitialState(compiledData); }
    switch (action.type) {
        case actionNames.VIEW_INITIAL: {
            var _a = action.payload, gui = _a.gui, autoRun = _a.autoRun, suites = _a.suites, skips = _a.skips, _b = _a.config, scaleImages = _b.scaleImages, lazyLoadOffset = _b.lazyLoadOffset;
            var formattedSuites = formatSuitesData(suites);
            return merge({}, state, { gui: gui, autoRun: autoRun, skips: skips, view: { scaleImages: scaleImages, lazyLoadOffset: lazyLoadOffset } }, formattedSuites);
        }
        case actionNames.RUN_ALL_TESTS: {
            var suites = clone(state.suites);
            setStatusToAll(suites, action.payload.status);
            return merge({}, state, { running: true, suites: suites }); // TODO: rewrite store on run all tests
        }
        case actionNames.RUN_FAILED_TESTS:
        case actionNames.RETRY_SUITE:
        case actionNames.RETRY_TEST: {
            return assign(clone(state), { running: true });
        }
        case actionNames.SUITE_BEGIN: {
            var suites = clone(state.suites);
            var _c = action.payload, suitePath = _c.suitePath, status_1 = _c.status;
            var test_1 = findNode(suites, suitePath);
            if (test_1) {
                test_1.status = status_1;
                forceUpdateSuiteData(suites, test_1);
            }
            return assign({}, state, { suites: suites });
        }
        case actionNames.TEST_BEGIN: {
            var suites = clone(state.suites);
            var _d = action.payload, suitePath = _d.suitePath, status_2 = _d.status, browserId_1 = _d.browserId;
            var test_2 = findNode(suites, suitePath);
            if (test_2) {
                test_2.status = status_2;
                test_2.browsers.forEach(function (b) {
                    if (b.name === browserId_1) {
                        b.result.status = status_2;
                    }
                });
                forceUpdateSuiteData(suites, test_2);
            }
            return assign({}, state, { suites: suites });
        }
        case actionNames.TESTS_END: {
            return assign(clone(state), { running: false });
        }
        case actionNames.TEST_RESULT: {
            return addTestResult(state, action);
        }
        case actionNames.UPDATE_RESULT: {
            return addTestResult(state, action);
        }
        case actionNames.VIEW_EXPAND_ALL: {
            return _mutateStateView(state, { expand: 'all' });
        }
        case actionNames.VIEW_EXPAND_ERRORS: {
            return _mutateStateView(state, { expand: 'errors' });
        }
        case actionNames.VIEW_EXPAND_RETRIES: {
            return _mutateStateView(state, { expand: 'retries' });
        }
        case actionNames.VIEW_COLLAPSE_ALL: {
            return _mutateStateView(state, { expand: 'none' });
        }
        case actionNames.VIEW_SHOW_ALL: {
            return _mutateStateView(state, { viewMode: 'all', expand: 'errors' });
        }
        case actionNames.VIEW_SHOW_FAILED: {
            return _mutateStateView(state, { viewMode: 'failed', expand: 'errors' });
        }
        case actionNames.VIEW_TOGGLE_SKIPPED: {
            return _mutateStateView(state, { showSkipped: !state.view.showSkipped });
        }
        case actionNames.VIEW_TOGGLE_ONLY_DIFF: {
            return _mutateStateView(state, { showOnlyDiff: !state.view.showOnlyDiff });
        }
        case actionNames.VIEW_TOGGLE_SCALE_IMAGES: {
            return _mutateStateView(state, { scaleImages: !state.view.scaleImages });
        }
        case actionNames.VIEW_TOGGLE_LAZY_LOAD_IMAGES: {
            return _mutateStateView(state, { lazyLoadOffset: state.view.lazyLoadOffset ? 0 : state.config.lazyLoadOffset });
        }
        case actionNames.VIEW_UPDATE_BASE_HOST: {
            var baseHost = action.host;
            var parsedHost = _parseHost(baseHost);
            return _mutateStateView(state, { baseHost: baseHost, parsedHost: parsedHost });
        }
        default:
            return state;
    }
}
function addTestResult(state, action) {
    var suites = clone(state.suites);
    [].concat(action.payload).forEach(function (suite) {
        var suitePath = suite.suitePath, browserResult = suite.browserResult, browserId = suite.browserId;
        var test = findNode(suites, suitePath);
        if (!test) {
            return;
        }
        test.browsers.forEach(function (b) {
            if (b.name === browserId) {
                Object.assign(b, browserResult);
            }
        });
        setStatusForBranch(suites, suitePath, browserResult.result.status);
        forceUpdateSuiteData(suites, test);
    });
    var suiteIds = clone(state.suiteIds);
    assign(suiteIds, { failed: getFailedSuiteIds(suites) });
    return assign({}, state, { suiteIds: suiteIds, suites: suites });
}
function _mutateStateView(state, mutation) {
    var newView = clone(state.view);
    assign(newView, mutation);
    return assign(clone(state), { view: newView });
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
    var parsedHost = url.parse(baseHost, false, true);
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
        suites: reduce(suites, function (acc, s) {
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
    return getSuiteIds(filter(suites, isSuiteFailed));
}
function getSuiteIds(suites) {
    if (suites === void 0) { suites = []; }
    return map(suites, getSuiteId);
}
function getSuiteId(suite) {
    return suite.suitePath[0];
}
/*
 *  To re-render suite we need to change object reference because of shallow data comparing
 */
function forceUpdateSuiteData(suites, test) {
    var id = getSuiteId(test);
    suites[id] = cloneDeep(suites[id]);
}
//# sourceMappingURL=reducer.js.map