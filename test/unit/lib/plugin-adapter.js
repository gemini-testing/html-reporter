'use strict';

const {EventEmitter} = require('events');
const _ = require('lodash');
const proxyquire = require('proxyquire');
const {logger} = require('lib/common-utils');
const {StaticReportBuilder} = require('lib/report-builder/static');
const {HtmlReporter} = require('lib/plugin-api');
const {stubTool, stubConfig} = require('../utils');
const {SqliteClient} = require('lib/sqlite-client');
const {GUI, MERGE_REPORTS, REMOVE_UNUSED_SCREENS} = require('lib/cli-commands').cliCommands;

describe('lib/plugin-adapter', () => {
    const sandbox = sinon.createSandbox();
    const cliCommands = {};
    let parseConfig;
    let tool;
    let toolReporter;
    let commander;
    let prepareData;

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
            .init(prepareData);
    }

    function initApiReporter_(opts) {
        initReporter_(opts);
        return tool.emitAsync(tool.events.INIT);
    }

    function initCliReporter_(opts, {command = 'foo'} = {}) {
        initReporter_(opts);

        const commander = mkCommander_(command);
        tool.emit(tool.events.CLI, commander);
        commander.emit(`command:${command}`);

        return tool.emitAsync(tool.events.INIT);
    }

    function mkCommander_(commands = ['default-command']) {
        commander = new EventEmitter();
        commander.commands = [].concat(commands).map((cmd) => ({name: () => cmd}));

        return commander;
    }

    beforeEach(() => {
        sandbox.stub(logger, 'log');
        sandbox.stub(logger, 'error');

        sandbox.stub(StaticReportBuilder, 'create').returns(Object.create(StaticReportBuilder.prototype));
        sandbox.stub(StaticReportBuilder.prototype, 'saveStaticFiles').resolves();
        sandbox.stub(StaticReportBuilder.prototype, 'finalize').resolves();

        prepareData = sandbox.stub().resolves();

        tool = mkHermione_();
        parseConfig = sandbox.stub().returns({enabled: true});
        cliCommands[GUI] = sandbox.stub();
        cliCommands[MERGE_REPORTS] = sandbox.stub();
        cliCommands[REMOVE_UNUSED_SCREENS] = sandbox.stub();

        toolReporter = proxyquire('lib/plugin-adapter', {
            './config': {parseConfig},
            './sqlite-client': {SqliteClient: {create: async () => sinon.createStubInstance(SqliteClient)}},
            [`./cli-commands/${GUI}`]: cliCommands[GUI],
            [`./cli-commands/${MERGE_REPORTS}`]: cliCommands[MERGE_REPORTS],
            [`./cli-commands/${REMOVE_UNUSED_SCREENS}`]: cliCommands[REMOVE_UNUSED_SCREENS]
        }).PluginAdapter;
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
                assert.instanceOf(tool.htmlReporter, HtmlReporter);
            });

            it(`should not register command if hermione called via API`, () => {
                return initApiReporter_({}).then(() => assert.notCalled(cliCommands[commandName]));
            });

            it('should not init html-reporter on running command', () => {
                return initCliReporter_({}, {command: commandName}).then(() => assert.notCalled(StaticReportBuilder.create));
            });
        });
    });

    describe('html-reporter', () => {
        let reportBuilder;

        beforeEach(() => {
            reportBuilder = Object.create(StaticReportBuilder.prototype);
            StaticReportBuilder.create.returns(reportBuilder);
        });

        it(`should init html-reporter if hermione called via API`, () => {
            return initApiReporter_({}).then(() => assert.calledOnce(StaticReportBuilder.create));
        });

        it('should prepare data', () => {
            return initCliReporter_({}, {})
                .then(() => assert.calledOnceWith(prepareData, tool, reportBuilder));
        });

        it('should save report', () => {
            return initCliReporter_({}, {})
                .then(() => {
                    tool.emit(tool.events.END);

                    return tool.emitAsync(tool.events.RUNNER_END).then(() => {
                        assert.calledOnce(StaticReportBuilder.prototype.finalize);
                    });
                });
        });

        it('should emit REPORT_SAVED event', async () => {
            await initCliReporter_({path: '/some/report/path'}, {});

            tool.emit(tool.events.END);
            await tool.emitAsync(tool.events.RUNNER_END);

            assert.calledOnceWith(tool.htmlReporter.emitAsync, 'reportSaved', {reportPath: '/some/report/path'});
        });

        it('should log correct path to html report', () => {
            return initCliReporter_({path: 'some/path'}, {})
                .then(() => {
                    tool.emit(tool.events.END);

                    return tool.emitAsync(tool.events.RUNNER_END).then(() => {
                        assert.calledWithMatch(logger.log, 'some/path');
                    });
                });
        });

        it('should log an error', () => {
            StaticReportBuilder.prototype.finalize.rejects('some-error');

            return initCliReporter_({}, {})
                .then(() => {
                    tool.emit(tool.events.END);

                    return tool.emitAsync(tool.events.RUNNER_END).then(() => {
                        assert.calledWith(logger.error, sinon.match('Html-reporter runtime error: some-error'));
                    });
                });
        });
    });
});
