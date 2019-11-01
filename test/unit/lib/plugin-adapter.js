'use strict';

const {EventEmitter} = require('events');
const _ = require('lodash');
const proxyquire = require('proxyquire');
const {logger} = require('lib/server-utils');
const ReportBuilder = require('lib/report-builder/report-builder-json');
const PluginApi = require('lib/plugin-api');
const {stubTool, stubConfig} = require('../utils');

describe('lib/plugin-adapter', () => {
    const sandbox = sinon.createSandbox();
    const cliCommands = {};
    let parseConfig;
    let tool;
    let toolReporter;
    let commander;
    let prepareData;
    let prepareImages;

    const events = {
        CLI: 'cli',
        INIT: 'init'
    };

    function mkHermione_() {
        return stubTool(stubConfig(), Object.assign(events, {RUNNER_END: 'runnerEnd'}));
    }

    function initReporter_(opts = {}) {
        opts = _.defaults(opts, {enabled: true, path: ''});
        parseConfig.returns(opts);

        return toolReporter.create(tool, opts)
            .addCliCommands()
            .init(prepareData, prepareImages);
    }

    function initApiReporter_(opts) {
        initReporter_(opts);
        return tool.emitAndWait(tool.events.INIT);
    }

    function initCliReporter_(opts, {command = 'foo'} = {}) {
        initReporter_(opts);

        const commander = mkCommander_(command);
        tool.emit(tool.events.CLI, commander);
        commander.emit(`command:${command}`);

        return tool.emitAndWait(tool.events.INIT);
    }

    function mkCommander_(commands = ['default-command']) {
        commander = new EventEmitter();
        commander.commands = [].concat(commands).map((cmd) => ({name: () => cmd}));

        return commander;
    }

    beforeEach(() => {
        sandbox.stub(logger, 'log');

        sandbox.stub(ReportBuilder, 'create').returns(Object.create(ReportBuilder.prototype));
        sandbox.stub(ReportBuilder.prototype, 'save').resolves({});
        sandbox.stub(logger, 'error');

        prepareData = sandbox.stub().resolves();
        prepareImages = sandbox.stub().resolves();

        tool = mkHermione_();
        parseConfig = sandbox.stub().returns({enabled: true});
        cliCommands.gui = sandbox.stub();
        cliCommands['merge-reports'] = sandbox.stub();
        cliCommands['create-blank-report'] = sandbox.stub();
        toolReporter = proxyquire('lib/plugin-adapter', {
            './config': parseConfig,
            './cli-commands/gui': cliCommands.gui,
            './cli-commands/merge-reports': cliCommands['merge-reports']
        });
    });

    afterEach(() => sandbox.restore());

    it('should parse config using passed options', () => {
        const opts = {path: 'some/path', enabled: false, baseHost: 'some-host'};

        toolReporter.create(tool, opts);

        assert.calledWith(parseConfig, {path: 'some/path', enabled: false, baseHost: 'some-host'});
    });

    describe('isEnabled', () => {
        it('should be enabled', () => {
            const plugin = toolReporter.create(tool, {enabled: true});

            assert.isTrue(plugin.isEnabled());
        });

        it('should be disabled', () => {
            const opts = {enabled: false};
            parseConfig.withArgs(opts).returns(opts);

            const plugin = toolReporter.create(tool, opts);

            assert.isFalse(plugin.isEnabled());
        });
    });

    [
        'gui',
        'merge-reports'
    ].forEach((commandName) => {
        describe(`${commandName} command`, () => {
            it('should register command on "CLI" event', () => {
                const opts = {enabled: true};
                const commander = mkCommander_(commandName);

                parseConfig.withArgs(opts).returns(opts);
                const plugin = toolReporter.create(tool, opts);

                plugin.addCliCommands();
                tool.emit(tool.events.CLI, commander);

                assert.calledOnceWith(cliCommands[commandName], commander, opts, tool);
            });

            it('should add api', () => {
                const opts = {enabled: true};
                const plugin = toolReporter.create(tool, opts);

                assert.deepEqual(plugin.addApi(), plugin);
                assert.instanceOf(tool.htmlReporter, PluginApi);
            });

            it(`should not register command if hermione called via API`, () => {
                return initApiReporter_({}).then(() => assert.notCalled(cliCommands[commandName]));
            });

            it('should not init html-reporter on running command', () => {
                return initCliReporter_({}, {command: commandName}).then(() => assert.notCalled(ReportBuilder.create));
            });
        });
    });

    describe('html-reporter', () => {
        let reportBuilder;
        let endRunnerEvent;

        beforeEach(() => {
            reportBuilder = Object.create(ReportBuilder.prototype);
            ReportBuilder.create.returns(reportBuilder);

            endRunnerEvent = tool.events.RUNNER_END;
        });

        it(`should init html-reporter if hermione called via API`, () => {
            return initApiReporter_({}).then(() => assert.calledOnce(ReportBuilder.create));
        });

        it('should prepare data', () => {
            return initCliReporter_({}, {})
                .then(() => assert.calledOnceWith(prepareData, tool, reportBuilder));
        });

        it('should prepare images', () => {
            const config = {enabled: true, path: ''};
            parseConfig.returns(config);

            return initCliReporter_({}, {})
                .then(() => assert.calledOnceWith(prepareImages, tool, reportBuilder, config));
        });

        it('should save report', () => {
            return initCliReporter_({}, {})
                .then(() => {
                    tool.emit(tool.events.END);

                    return tool.emitAndWait(endRunnerEvent).then(() => {
                        assert.calledOnce(ReportBuilder.prototype.save);
                    });
                });
        });

        it('should log correct path to html report', () => {
            return initCliReporter_({path: 'some/path'}, {})
                .then(() => {
                    ReportBuilder.prototype.save.resolves({reportPath: 'some/path'});
                    tool.emit(tool.events.END);

                    return tool.emitAndWait(endRunnerEvent).then(() => {
                        assert.calledWithMatch(logger.log, 'some/path');
                    });
                });
        });

        it('should log an error', () => {
            return initCliReporter_({}, {})
                .then(() => {
                    ReportBuilder.prototype.save.rejects('some-error');
                    tool.emit(tool.events.END);

                    return tool.emitAndWait(endRunnerEvent).then(() => {
                        assert.calledWith(logger.error, sinon.match('Html-reporter runtime error: some-error'));
                    });
                });
        });
    });
});
