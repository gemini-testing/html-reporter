'use strict';

const {EventEmitter} = require('events');
const _ = require('lodash');
const proxyquire = require('proxyquire');
const {logger} = require('lib/server-utils');
const ReportBuilder = require('lib/report-builder-factory/report-builder');
const {stubTool, stubConfig} = require('../utils');

describe('lib/plugin-adapter', () => {
    const sandbox = sinon.createSandbox();
    let parseConfig;
    let tool;
    let toolName;
    let toolReporter;
    let gui;
    let commander;
    let prepareData;
    let prepareImages;

    const events = {
        CLI: 'cli',
        INIT: 'init'
    };

    function mkGemini_() {
        return stubTool(stubConfig(), Object.assign(events, {END_RUNNER: 'endRunner'}));
    }

    function mkHermione_() {
        return stubTool(stubConfig(), Object.assign(events, {RUNNER_END: 'runnerEnd'}));
    }

    function initReporter_(opts = {}) {
        opts = _.defaults(opts, {enabled: true});
        parseConfig.returns(opts);

        return toolReporter.create(tool, opts, toolName)
            .extendCliByGuiCommand()
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

        prepareData = sandbox.stub().resolves();
        prepareImages = sandbox.stub().resolves();
    });

    afterEach(() => sandbox.restore());

    [
        {
            name: 'gemini',
            initTool: mkGemini_
        },
        {
            name: 'hermione',
            initTool: mkHermione_
        }
    ].forEach(({name, initTool}) => {
        describe(`${name}`, () => {
            beforeEach(() => {
                tool = initTool();
                toolName = name;
                parseConfig = sandbox.stub().returns({enabled: true});
                gui = sandbox.stub();
                toolReporter = proxyquire('lib/plugin-adapter', {
                    './config': parseConfig,
                    './gui': gui
                });
            });

            it('should parse config using passed options', () => {
                const opts = {path: 'some/path', enabled: false, baseHost: 'some-host'};

                toolReporter.create(tool, opts, toolName);

                assert.calledWith(parseConfig, {path: 'some/path', enabled: false, baseHost: 'some-host'});
            });

            describe('isEnabled', () => {
                it('should be enabled', () => {
                    const plugin = toolReporter.create(tool, {enabled: true}, toolName);

                    assert.isTrue(plugin.isEnabled());
                });

                it('should be disabled', () => {
                    const opts = {enabled: false};
                    parseConfig.withArgs(opts).returns(opts);

                    const plugin = toolReporter.create(tool, opts, toolName);

                    assert.isFalse(plugin.isEnabled());
                });
            });

            describe('gui', () => {
                it('should register gui command on "CLI" event', () => {
                    const opts = {enabled: true};
                    const commander = mkCommander_('gui');

                    parseConfig.withArgs(opts).returns(opts);
                    const plugin = toolReporter.create(tool, opts, toolName);

                    plugin.extendCliByGuiCommand();
                    tool.emit(tool.events.CLI, commander);

                    assert.calledOnceWith(gui, commander, tool, opts);
                });

                it(`should not register gui command if ${toolName} called via API`, () => {
                    return initApiReporter_().then(() => assert.notCalled(gui));
                });

                it('should not init html-reporter on running gui command', () => {
                    return initCliReporter_({}, {command: 'gui'}).then(() => assert.notCalled(ReportBuilder.create));
                });
            });

            describe('html-reporter', () => {
                let reportBuilder;
                let endRunnerEvent;

                beforeEach(() => {
                    reportBuilder = Object.create(ReportBuilder.prototype);
                    ReportBuilder.create.returns(reportBuilder);

                    endRunnerEvent = toolName === 'gemini'
                        ? tool.events.END_RUNNER
                        : tool.events.RUNNER_END;
                });

                it(`should init html-reporter if ${toolName} called via API`, () => {
                    return initApiReporter_().then(() => assert.calledOnce(ReportBuilder.create));
                });

                it('should prepare data', () => {
                    return initCliReporter_()
                        .then(() => assert.calledOnceWith(prepareData, tool, reportBuilder));
                });

                it('should prepare images', () => {
                    const config = {enabled: true};
                    parseConfig.returns(config);

                    return initCliReporter_()
                        .then(() => assert.calledOnceWith(prepareImages, tool, config, reportBuilder));
                });

                it('should save report', () => {
                    return initCliReporter_()
                        .then(() => {
                            tool.emit(tool.events.END);

                            return tool.emitAndWait(endRunnerEvent).then(() => {
                                assert.calledOnce(ReportBuilder.prototype.save);
                            });
                        });
                });

                it('should log correct path to html report', () => {
                    return initCliReporter_()
                        .then(() => {
                            ReportBuilder.prototype.save.resolves({reportPath: 'some/path'});
                            tool.emit(tool.events.END);

                            return tool.emitAndWait(endRunnerEvent).then(() => {
                                assert.calledWithMatch(logger.log, 'some/path');
                            });
                        });
                });
            });
        });
    });
});
