'use strict';
var _ = require('lodash');
var proxyquire = require('proxyquire');
var ReportBuilder = require('lib/report-builder-factory/report-builder');
var stubTool = require('test/utils').stubTool;
describe('lib/gui/tool-runner-factory/hermione/index', function () {
    var sandbox = sinon.createSandbox();
    var reportBuilder;
    var ToolGuiReporter;
    var mkTestCollection_ = function (testsTree) {
        if (testsTree === void 0) { testsTree = {}; }
        return { eachTest: function (cb) { return _.forEach(testsTree, cb); } };
    };
    var stubTest_ = function (opts) {
        return _.defaults(opts, { id: function () { return 'default-id'; } });
    };
    var mkToolCliOpts_ = function (globalCliOpts, guiCliOpts) {
        if (globalCliOpts === void 0) { globalCliOpts = { name: function () { return 'hermione'; } }; }
        if (guiCliOpts === void 0) { guiCliOpts = {}; }
        return { program: globalCliOpts, options: guiCliOpts };
    };
    var mkPluginConfig_ = function (config) {
        if (config === void 0) { config = {}; }
        var pluginConfig = _.defaults(config, { path: 'default-path' });
        return { pluginConfig: pluginConfig };
    };
    var initGuiReporter = function (hermione, opts) {
        if (opts === void 0) { opts = {}; }
        opts = _.defaults(opts, {
            paths: [],
            configs: {}
        });
        var configs = _.defaults(opts.configs, mkToolCliOpts_(), mkPluginConfig_());
        return ToolGuiReporter.create(opts.paths, hermione, configs);
    };
    beforeEach(function () {
        reportBuilder = sinon.createStubInstance(ReportBuilder);
        sandbox.stub(ReportBuilder, 'create').returns(reportBuilder);
        reportBuilder.getResult.returns({});
        ToolGuiReporter = proxyquire("lib/gui/tool-runner-factory/hermione", {
            './report-subscriber': sandbox.stub()
        });
    });
    afterEach(function () { return sandbox.restore(); });
    describe('initialize', function () {
        it('should not add disabled test to report', function () {
            var hermione = stubTool();
            hermione.readTests.resolves(mkTestCollection_({ bro: stubTest_({ disabled: true }) }));
            var gui = initGuiReporter(hermione, { paths: ['foo'] });
            return gui.initialize()
                .then(function () {
                assert.notCalled(reportBuilder.addSkipped);
                assert.notCalled(reportBuilder.addIdle);
            });
        });
        it('should not add silently skipped test to report', function () {
            var hermione = stubTool();
            hermione.readTests.resolves(mkTestCollection_({ bro: stubTest_({ silentSkip: true }) }));
            var gui = initGuiReporter(hermione, { paths: ['foo'] });
            return gui.initialize()
                .then(function () {
                assert.notCalled(reportBuilder.addSkipped);
                assert.notCalled(reportBuilder.addIdle);
            });
        });
        it('should add skipped test to report', function () {
            var hermione = stubTool();
            hermione.readTests.resolves(mkTestCollection_({ bro: stubTest_({ pending: true }) }));
            var gui = initGuiReporter(hermione, { paths: ['foo'] });
            return gui.initialize()
                .then(function () { return assert.calledOnce(reportBuilder.addSkipped); });
        });
        it('should add idle test to report', function () {
            var hermione = stubTool();
            hermione.readTests.resolves(mkTestCollection_({ bro: stubTest_() }));
            var gui = initGuiReporter(hermione, { paths: ['foo'] });
            return gui.initialize()
                .then(function () { return assert.calledOnce(reportBuilder.addIdle); });
        });
    });
});
//# sourceMappingURL=index.js.map