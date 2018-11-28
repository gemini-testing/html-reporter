'use strict';
var _ = require('lodash');
var QEmitter = require('qemitter');
function stubConfig(config) {
    if (config === void 0) { config = {}; }
    var browsers = config.browsers || {};
    var browserConfigs = {
        getBrowserIds: sinon.stub().named('getBrowserIds').returns(Object.keys(browsers)),
        forBrowser: sinon.stub().named('forBrowser').callsFake(function (bro) { return _.defaults(browsers[bro], config); })
    };
    return Object.assign(_.omit(config, 'browsers'), browserConfigs);
}
function stubTool(config, events, errors) {
    if (config === void 0) { config = stubConfig(); }
    if (events === void 0) { events = {}; }
    if (errors === void 0) { errors = {}; }
    var tool = new QEmitter();
    tool.config = config;
    tool.events = events;
    tool.errors = errors;
    tool.readTests = sinon.stub();
    return tool;
}
function mkSuite(opts) {
    if (opts === void 0) { opts = {}; }
    return _.defaults(opts, {
        name: _.last(opts.suitePath) || 'default-suite',
        suitePath: ['default-suite'],
        status: 'default',
        children: []
    });
}
function mkState(opts) {
    if (opts === void 0) { opts = {}; }
    return _.defaults(opts, {
        name: _.last(opts.suitePath) || 'default-state',
        suitePath: ['default-suite', 'default-state'],
        status: 'default',
        browsers: []
    });
}
function mkBrowserResult(opts) {
    if (opts === void 0) { opts = {}; }
    return _.defaults(opts, {
        name: 'default-bro',
        result: mkTestResult({ name: opts.name }),
        retries: []
    });
}
function mkTestResult(result) {
    return _.defaults(result, {
        name: 'default-bro',
        suiteUrl: '',
        metaInfo: {},
        imagesInfo: [],
        status: 'default',
        attempt: 0
    });
}
function mkSuiteTree(_a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.suite, suite = _c === void 0 ? mkSuite() : _c, _d = _b.state, state = _d === void 0 ? mkState() : _d, _e = _b.browsers, browsers = _e === void 0 ? [mkBrowserResult()] : _e;
    suite.children.push(state);
    state.browsers = browsers;
    return suite;
}
module.exports = {
    stubConfig: stubConfig,
    stubTool: stubTool,
    mkSuite: mkSuite,
    mkState: mkState,
    mkBrowserResult: mkBrowserResult,
    mkTestResult: mkTestResult,
    mkSuiteTree: mkSuiteTree
};
//# sourceMappingURL=utils.js.map