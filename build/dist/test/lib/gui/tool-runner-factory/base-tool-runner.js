'use strict';
var path = require('path');
var _ = require('lodash');
var proxyquire = require('proxyquire');
var ReportBuilder = require('lib/report-builder-factory/report-builder');
var _a = require('test/utils'), stubTool = _a.stubTool, stubConfig = _a.stubConfig, mkSuite = _a.mkSuite, mkState = _a.mkState, mkBrowserResult = _a.mkBrowserResult, mkSuiteTree = _a.mkSuiteTree;
var serverUtils = require('lib/server-utils');
describe('lib/gui/tool-runner-factory/base-tool-runner', function () {
    var sandbox = sinon.createSandbox();
    var reportBuilder;
    var ToolGuiReporter;
    var tool;
    var mkTool_ = function () { return stubTool(stubConfig()); };
    var mkToolCliOpts_ = function (globalCliOpts, guiCliOpts) {
        if (globalCliOpts === void 0) { globalCliOpts = { name: function () { return 'tool'; } }; }
        if (guiCliOpts === void 0) { guiCliOpts = {}; }
        return { program: globalCliOpts, options: guiCliOpts };
    };
    var mkPluginConfig_ = function (config) {
        if (config === void 0) { config = {}; }
        var pluginConfig = _.defaults(config, { path: 'default-path' });
        return { pluginConfig: pluginConfig };
    };
    var mkGeminiSuiteCollection_ = function () {
        return {
            topLevelSuites: sandbox.stub().returns([]),
            allSuites: sandbox.stub().returns([]),
            clone: function () {
                return this;
            }
        };
    };
    var mkHermioneTestCollection_ = function () { return ({ eachTest: sandbox.stub() }); };
    var initGuiReporter = function (opts) {
        if (opts === void 0) { opts = {}; }
        opts = _.defaults(opts, {
            paths: [],
            configs: {}
        });
        var configs = _.defaults(opts.configs, mkToolCliOpts_(), mkPluginConfig_());
        return ToolGuiReporter.create(opts.paths, tool, configs);
    };
    beforeEach(function () {
        sandbox.stub(serverUtils.logger, 'warn');
        sandbox.stub(serverUtils, 'require').returns({});
        reportBuilder = sinon.createStubInstance(ReportBuilder);
        sandbox.stub(ReportBuilder, 'create').returns(reportBuilder);
        reportBuilder.getResult.returns({});
    });
    afterEach(function () { return sandbox.restore(); });
    [
        {
            name: 'gemini',
            collection: mkGeminiSuiteCollection_()
        },
        {
            name: 'hermione',
            collection: mkHermioneTestCollection_()
        }
    ].forEach(function (_a) {
        var name = _a.name, collection = _a.collection;
        beforeEach(function () {
            tool = mkTool_();
            tool.readTests.resolves(collection);
            ToolGuiReporter = proxyquire("lib/gui/tool-runner-factory/" + name, {
                './report-subscriber': sandbox.stub()
            });
        });
        describe("initialize " + name, function () {
            it('should pass paths to "readTests" method', function () {
                var gui = initGuiReporter({ paths: ['foo', 'bar'] });
                return gui.initialize()
                    .then(function () { return assert.calledOnceWith(tool.readTests, ['foo', 'bar']); });
            });
            it('should pass "grep", "sets" and "browsers" options to "readTests" method', function () {
                var grep = 'foo';
                var set = 'bar';
                var browser = 'yabro';
                var gui = initGuiReporter({
                    configs: {
                        program: { name: function () { return 'tool'; }, grep: grep, set: set, browser: browser }
                    }
                });
                return gui.initialize()
                    .then(function () {
                    assert.calledOnceWith(tool.readTests, sinon.match.any, { grep: grep, sets: set, browsers: browser });
                });
            });
        });
        describe("finalize " + name, function () {
            it('should save data file', function () {
                var gui = initGuiReporter();
                gui.finalize();
                assert.calledOnce(reportBuilder.saveDataFileSync);
            });
        });
        describe("reuse " + name + " data", function () {
            it('should not try load data for reuse if suites are empty', function () {
                var gui = initGuiReporter({ configs: mkPluginConfig_({ path: 'report_path' }) });
                return gui.initialize()
                    .then(function () { return assert.notCalled(serverUtils.require); });
            });
            it('should try to load data for reuse', function () {
                var gui = initGuiReporter({ configs: mkPluginConfig_({ path: 'report_path' }) });
                var reusePath = path.resolve(process.cwd(), 'report_path/data');
                var suites = [mkSuiteTree()];
                reportBuilder.getResult.returns({ suites: suites });
                return gui.initialize()
                    .then(function () { return assert.calledOnceWith(serverUtils.require, reusePath); });
            });
            it('should not fail if data for reuse does not exist', function () {
                var gui = initGuiReporter();
                var suites = [mkSuiteTree()];
                reportBuilder.getResult.returns({ suites: suites });
                serverUtils.require.throws(new Error('Cannot find module'));
                return assert.isFulfilled(gui.initialize());
            });
            it('should log a warning that there is no data for reuse', function () {
                var gui = initGuiReporter();
                serverUtils.require.throws(new Error('Cannot find module'));
                var suites = [mkSuiteTree()];
                reportBuilder.getResult.returns({ suites: suites });
                return gui.initialize()
                    .then(function () { return assert.calledWithMatch(serverUtils.logger.warn, 'Nothing to reuse'); });
            });
            describe('should not apply reuse data if', function () {
                it('it does not exist', function () {
                    var gui = initGuiReporter();
                    serverUtils.require.throws(new Error('Cannot find module'));
                    var suites = [mkSuiteTree()];
                    reportBuilder.getResult.returns({ suites: suites });
                    return gui.initialize()
                        .then(function () { return assert.deepEqual(gui.tree.suites, suites); });
                });
                it('it is empty', function () {
                    var gui = initGuiReporter();
                    var suites = [mkSuiteTree()];
                    reportBuilder.getResult.returns({ suites: suites });
                    return gui.initialize()
                        .then(function () { return assert.deepEqual(gui.tree.suites, suites); });
                });
            });
            it('should apply reuse data only for the matched browser', function () {
                var gui = initGuiReporter();
                var reuseYaBro = mkBrowserResult({
                    name: 'yabro',
                    result: { status: 'success' }
                });
                var reuseSuites = [mkSuiteTree({ browsers: [reuseYaBro] })];
                serverUtils.require.returns({ suites: reuseSuites });
                var chromeBro = mkBrowserResult({ name: 'chrome' });
                var suites = [mkSuiteTree({
                        browsers: [mkBrowserResult({ name: 'yabro' }), chromeBro]
                    })];
                reportBuilder.getResult.returns({ suites: suites });
                return gui.initialize()
                    .then(function () {
                    var browsers = gui.tree.suites[0].children[0].browsers;
                    assert.deepEqual(browsers[0], reuseYaBro);
                    assert.deepEqual(browsers[1], chromeBro);
                });
            });
            it('should apply reuse data for tree with nested suites', function () {
                var gui = initGuiReporter();
                var reuseYaBro = mkBrowserResult({
                    name: 'yabro',
                    result: { status: 'success' }
                });
                var reuseSuite = mkSuite({ suitePath: ['suite1'] });
                var reuseNestedSuite = mkSuiteTree({
                    suite: mkSuite({ suitePath: ['suite1', 'suite2'] }),
                    state: mkState({ suitePath: ['suite1', 'suite2', 'state'] }),
                    browsers: [reuseYaBro]
                });
                reuseSuite.children.push(reuseNestedSuite);
                serverUtils.require.returns({ suites: [reuseSuite] });
                var suite = mkSuite({ suitePath: ['suite1'] });
                var nestedSuite = mkSuiteTree({
                    suite: mkSuite({ suitePath: ['suite1', 'suite2'] }),
                    state: mkState({ suitePath: ['suite1', 'suite2', 'state'] }),
                    browsers: [mkBrowserResult({ name: 'yabro' })]
                });
                suite.children.push(nestedSuite);
                reportBuilder.getResult.returns({ suites: [suite] });
                return gui.initialize()
                    .then(function () {
                    assert.deepEqual(gui.tree.suites[0].children[0].children[0].browsers[0], reuseYaBro);
                });
            });
            it('should change "status" for each level of the tree if data is reused', function () {
                var gui = initGuiReporter();
                var reuseSuites = [mkSuiteTree({
                        suite: mkSuite({ status: 'fail' }),
                        state: mkState({ status: 'success' }),
                        browsers: [mkBrowserResult({ status: 'skipped' })]
                    })];
                serverUtils.require.returns({ suites: reuseSuites });
                var suites = [mkSuiteTree({
                        suite: mkSuite({ status: 'idle' }),
                        state: mkState({ status: 'idle' }),
                        browsers: [mkBrowserResult({ status: 'idle' })]
                    })];
                reportBuilder.getResult.returns({ suites: suites });
                return gui.initialize()
                    .then(function () {
                    var suite = gui.tree.suites[0];
                    assert.equal(suite.status, 'fail');
                    assert.equal(suite.children[0].status, 'success');
                    assert.equal(suite.children[0].browsers[0].status, 'skipped');
                });
            });
            it('should not change "status" for any level of the tree if data is not reused', function () {
                var gui = initGuiReporter();
                var reuseSuites = [mkSuiteTree({
                        suite: mkSuite({ status: 'fail' }),
                        state: mkState({ status: 'success' }),
                        browsers: [mkBrowserResult({ name: 'yabro', status: 'skipped' })]
                    })];
                serverUtils.require.returns({ suites: reuseSuites });
                var suites = [mkSuiteTree({
                        suite: mkSuite({ status: 'idle' }),
                        state: mkState({ status: 'idle' }),
                        browsers: [mkBrowserResult({ name: 'chrome', status: 'idle' })]
                    })];
                reportBuilder.getResult.returns({ suites: suites });
                return gui.initialize()
                    .then(function () {
                    var suite = gui.tree.suites[0];
                    assert.equal(suite.status, 'idle');
                    assert.equal(suite.children[0].status, 'idle');
                    assert.equal(suite.children[0].browsers[0].status, 'idle');
                });
            });
        });
    });
});
//# sourceMappingURL=base-tool-runner.js.map