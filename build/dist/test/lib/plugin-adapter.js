'use strict';
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var proxyquire = require('proxyquire');
var logger = require('lib/server-utils').logger;
var ReportBuilder = require('lib/report-builder-factory/report-builder');
var _a = require('../utils'), stubTool = _a.stubTool, stubConfig = _a.stubConfig;
describe('lib/plugin-adapter', function () {
    var sandbox = sinon.createSandbox();
    var cliCommands = {};
    var parseConfig;
    var tool;
    var toolReporter;
    var commander;
    var prepareData;
    var prepareImages;
    var events = {
        CLI: 'cli',
        INIT: 'init'
    };
    function mkGemini_() {
        return stubTool(stubConfig(), Object.assign(events, { END_RUNNER: 'endRunner' }));
    }
    function mkHermione_() {
        return stubTool(stubConfig(), Object.assign(events, { RUNNER_END: 'runnerEnd' }));
    }
    function initReporter_(opts, toolName) {
        if (opts === void 0) { opts = {}; }
        opts = _.defaults(opts, { enabled: true });
        parseConfig.returns(opts);
        return toolReporter.create(tool, opts, toolName)
            .addCliCommands()
            .init(prepareData, prepareImages);
    }
    function initApiReporter_(opts, toolName) {
        initReporter_(opts, toolName);
        return tool.emitAndWait(tool.events.INIT);
    }
    function initCliReporter_(opts, _a, toolName) {
        var _b = (_a === void 0 ? {} : _a).command, command = _b === void 0 ? 'foo' : _b;
        initReporter_(opts, toolName);
        var commander = mkCommander_(command);
        tool.emit(tool.events.CLI, commander);
        commander.emit("command:" + command);
        return tool.emitAndWait(tool.events.INIT);
    }
    function mkCommander_(commands) {
        if (commands === void 0) { commands = ['default-command']; }
        commander = new EventEmitter();
        commander.commands = [].concat(commands).map(function (cmd) { return ({ name: function () { return cmd; } }); });
        return commander;
    }
    beforeEach(function () {
        sandbox.stub(logger, 'log');
        sandbox.stub(ReportBuilder, 'create').returns(Object.create(ReportBuilder.prototype));
        sandbox.stub(ReportBuilder.prototype, 'save').resolves({});
        prepareData = sandbox.stub().resolves();
        prepareImages = sandbox.stub().resolves();
    });
    afterEach(function () { return sandbox.restore(); });
    [
        {
            toolName: 'gemini',
            initTool: mkGemini_
        },
        {
            toolName: 'hermione',
            initTool: mkHermione_
        }
    ].forEach(function (_a) {
        var toolName = _a.toolName, initTool = _a.initTool;
        describe("" + toolName, function () {
            beforeEach(function () {
                tool = initTool();
                parseConfig = sandbox.stub().returns({ enabled: true });
                cliCommands.gui = sandbox.stub();
                cliCommands['merge-reports'] = sandbox.stub();
                toolReporter = proxyquire('lib/plugin-adapter', {
                    './config': parseConfig,
                    './cli-commands/gui': cliCommands.gui,
                    './cli-commands/merge-reports': cliCommands['merge-reports']
                });
            });
            it('should parse config using passed options', function () {
                var opts = { path: 'some/path', enabled: false, baseHost: 'some-host' };
                toolReporter.create(tool, opts, toolName);
                assert.calledWith(parseConfig, { path: 'some/path', enabled: false, baseHost: 'some-host' });
            });
            describe('isEnabled', function () {
                it('should be enabled', function () {
                    var plugin = toolReporter.create(tool, { enabled: true }, toolName);
                    assert.isTrue(plugin.isEnabled());
                });
                it('should be disabled', function () {
                    var opts = { enabled: false };
                    parseConfig.withArgs(opts).returns(opts);
                    var plugin = toolReporter.create(tool, opts, toolName);
                    assert.isFalse(plugin.isEnabled());
                });
            });
            [
                'gui',
                'merge-reports'
            ].forEach(function (commandName) {
                describe(commandName + " command", function () {
                    it('should register command on "CLI" event', function () {
                        var opts = { enabled: true };
                        var commander = mkCommander_(commandName);
                        parseConfig.withArgs(opts).returns(opts);
                        var plugin = toolReporter.create(tool, opts, toolName);
                        plugin.addCliCommands();
                        tool.emit(tool.events.CLI, commander);
                        assert.calledOnceWith(cliCommands[commandName], commander, opts, tool);
                    });
                    it("should not register command if " + toolName + " called via API", function () {
                        return initApiReporter_({}, toolName).then(function () { return assert.notCalled(cliCommands[commandName]); });
                    });
                    it('should not init html-reporter on running command', function () {
                        return initCliReporter_({}, { command: commandName }, toolName).then(function () { return assert.notCalled(ReportBuilder.create); });
                    });
                });
            });
            describe('html-reporter', function () {
                var reportBuilder;
                var endRunnerEvent;
                beforeEach(function () {
                    reportBuilder = Object.create(ReportBuilder.prototype);
                    ReportBuilder.create.returns(reportBuilder);
                    endRunnerEvent = toolName === 'gemini'
                        ? tool.events.END_RUNNER
                        : tool.events.RUNNER_END;
                });
                it("should init html-reporter if " + toolName + " called via API", function () {
                    return initApiReporter_({}, toolName).then(function () { return assert.calledOnce(ReportBuilder.create); });
                });
                it('should prepare data', function () {
                    return initCliReporter_({}, {}, toolName)
                        .then(function () { return assert.calledOnceWith(prepareData, tool, reportBuilder); });
                });
                it('should prepare images', function () {
                    var config = { enabled: true };
                    parseConfig.returns(config);
                    return initCliReporter_({}, {}, toolName)
                        .then(function () { return assert.calledOnceWith(prepareImages, tool, config, reportBuilder); });
                });
                it('should save report', function () {
                    return initCliReporter_({}, {}, toolName)
                        .then(function () {
                        tool.emit(tool.events.END);
                        return tool.emitAndWait(endRunnerEvent).then(function () {
                            assert.calledOnce(ReportBuilder.prototype.save);
                        });
                    });
                });
                it('should log correct path to html report', function () {
                    return initCliReporter_({}, {}, toolName)
                        .then(function () {
                        ReportBuilder.prototype.save.resolves({ reportPath: 'some/path' });
                        tool.emit(tool.events.END);
                        return tool.emitAndWait(endRunnerEvent).then(function () {
                            assert.calledWithMatch(logger.log, 'some/path');
                        });
                    });
                });
            });
        });
    });
});
//# sourceMappingURL=plugin-adapter.js.map