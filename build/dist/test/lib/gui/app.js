'use strict';
var _ = require('lodash');
var Promise = require('bluebird');
var App = require('lib/gui/app');
var ToolRunnerFactory = require('lib/gui/tool-runner-factory');
var _a = require('../../utils'), stubTool = _a.stubTool, stubConfig = _a.stubConfig;
describe('lib/gui/app', function () {
    var sandbox = sinon.createSandbox().usingPromise(Promise);
    var tool;
    var toolRunner;
    var mkApp_ = function (opts) {
        if (opts === void 0) { opts = {}; }
        opts = _.defaults(opts, {
            paths: 'paths',
            tool: stubTool(),
            configs: { program: { name: function () { return 'tool'; } } }
        });
        return new App(opts.paths, opts.tool, opts.configs);
    };
    var mkToolRunner_ = function (tool) {
        if (tool === void 0) { tool = {}; }
        return {
            run: sandbox.stub().named('run').resolves(),
            finalize: sandbox.stub().named('finalize'),
            config: tool.config
        };
    };
    beforeEach(function () {
        var browserConfigs = {
            bro1: { id: 'bro1', retry: 1 },
            bro2: { id: 'bro2', retry: 2 }
        };
        tool = stubTool(stubConfig({ browsers: browserConfigs }));
        toolRunner = mkToolRunner_(tool);
        sandbox.stub(ToolRunnerFactory, 'create').returns(toolRunner);
    });
    afterEach(function () { return sandbox.restore(); });
    describe('run', function () {
        it('should run all tests with retries from config', function () {
            var retryBeforeRun;
            toolRunner.run.callsFake(function () {
                retryBeforeRun = tool.config.forBrowser('bro1').retry;
                return Promise.resolve();
            });
            return mkApp_({ tool: tool })
                .run()
                .then(function () { return assert.equal(retryBeforeRun, 1); });
        });
        it('should run specified tests with no retries', function () {
            var bro1RetryBeforeRun;
            var bro2RetryBeforeRun;
            toolRunner.run.callsFake(function () {
                bro1RetryBeforeRun = tool.config.forBrowser('bro1').retry;
                bro2RetryBeforeRun = tool.config.forBrowser('bro2').retry;
                return Promise.resolve();
            });
            return mkApp_({ tool: tool })
                .run(['test'])
                .then(function () {
                assert.equal(bro1RetryBeforeRun, 0);
                assert.equal(bro2RetryBeforeRun, 0);
            });
        });
        it('should restore config retry values after run', function () {
            return mkApp_({ tool: tool })
                .run(['test'])
                .then(function () {
                assert.equal(tool.config.forBrowser('bro1').retry, 1);
                assert.equal(tool.config.forBrowser('bro2').retry, 2);
            });
        });
        it('should restore config retry values even after error', function () {
            toolRunner.run.rejects();
            return mkApp_({ tool: tool })
                .run(['test'])
                .catch(function () {
                assert.equal(tool.config.forBrowser('bro1').retry, 1);
                assert.equal(tool.config.forBrowser('bro2').retry, 2);
            });
        });
    });
    describe('finalize', function () {
        it('should properly complete tool working', function () {
            var app = mkApp_({ tool: tool });
            app.finalize();
            assert.calledOnce(toolRunner.finalize);
        });
    });
});
//# sourceMappingURL=app.js.map