'use strict';

const {EventEmitter} = require('events');
const _ = require('lodash');
const fs = require('fs-extra');
const proxyquire = require('proxyquire');
const utils = require('../lib/server-utils');
const ReportBuilder = require('../lib/report-builder-factory/report-builder');
const {stubTool} = require('./utils');
const {logger} = utils;

describe('Gemini Reporter', () => {
    const sandbox = sinon.createSandbox();
    let parseConfig;
    let gemini;
    let GeminiReporter;
    let geminiGui;
    let commander;

    const events = {
        CLI: 'cli',
        INIT: 'init',
        END_RUNNER: 'endRunner',
        END: 'end',
        RETRY: 'retry',
        SKIP_STATE: 'skipState',
        ERROR: 'err',
        TEST_RESULT: 'testResult',
        UPDATE_RESULT: 'updateResult'
    };

    function mkGemini_() {
        return stubTool({
            forBrowser: sandbox.stub().returns({
                getAbsoluteUrl: () => {}
            })
        }, events);
    }

    function initReporter_(opts) {
        opts = _.defaults(opts || {}, {
            enabled: true,
            path: 'default-path',
            baseHost: ''
        });
        parseConfig.returns(opts);

        gemini = mkGemini_();
        GeminiReporter(gemini, opts);
    }

    function initApiReporter_(opts) {
        initReporter_(opts);
        return gemini.emitAndWait(gemini.events.INIT);
    }

    function initCliReporter_(opts, {command = 'foo'} = {}) {
        initReporter_(opts);

        const commander = mkCommander_(command);
        gemini.emit(gemini.events.CLI, commander);
        commander.emit(`command:${command}`);

        return gemini.emitAndWait(gemini.events.INIT);
    }

    function mkCommander_(commands = ['default-command']) {
        commander = new EventEmitter();
        commander.commands = [].concat(commands).map((cmd) => ({name: () => cmd}));

        return commander;
    }

    function mkStubResult_(options) {
        return _.defaultsDeep(options, {
            state: {name: 'name-default'},
            browserId: 'browserId-default',
            suite: {
                path: ['suite/path-default'],
                metaInfo: {sessionId: 'sessionId-default'}
            },
            saveDiffTo: sandbox.stub(),
            currentPath: 'current/path-default',
            referencePath: 'reference/path-default',
            equal: false
        });
    }

    beforeEach(() => {
        parseConfig = sandbox.stub().returns({enabled: true});
        geminiGui = sandbox.stub();
        GeminiReporter = proxyquire('../gemini.js', {
            './lib/config': parseConfig,
            './lib/gui': geminiGui
        });
        sandbox.stub(logger, 'log');

        sandbox.stub(fs, 'mkdirsAsync').resolves();
        sandbox.stub(fs, 'writeFileAsync').resolves();
        sandbox.stub(fs, 'copyAsync').resolves();
        sandbox.stub(utils, 'copyImageAsync');

        sandbox.spy(ReportBuilder, 'create');
        sandbox.spy(ReportBuilder.prototype, 'setStats');
        sandbox.stub(ReportBuilder.prototype, 'addSuccess');
        sandbox.stub(ReportBuilder.prototype, 'save').resolves({});
    });

    afterEach(() => sandbox.restore());

    it('should parse config using passed options', () => {
        return initCliReporter_({path: 'some/path', enabled: false, baseHost: 'some-host'})
            .then(() => {
                assert.calledWith(parseConfig, {path: 'some/path', enabled: false, baseHost: 'some-host'});
            });
    });

    describe('gui', () => {
        it('should register gui command on "CLI" event', () => {
            gemini = mkGemini_();
            const opts = {enabled: true};
            const commander = mkCommander_('gui');

            parseConfig.withArgs(opts).returns(opts);
            GeminiReporter(gemini, opts);

            gemini.emit(gemini.events.CLI, commander);

            assert.calledOnceWith(geminiGui, commander, gemini, opts);
        });

        it('should not register gui command if gemini called via API', () => {
            return initApiReporter_().then(() => assert.notCalled(geminiGui));
        });

        it('should not init html reporter on running gui command', () => {
            return initCliReporter_({}, {command: 'gui'})
                .then(() => {
                    assert.notCalled(ReportBuilder.create);
                });
        });
    });

    describe('html-reporter', () => {
        it('should init html-reporter if gemini called via API', () => {
            return initApiReporter_().then(() => {
                assert.calledOnce(ReportBuilder.create);
            });
        });

        it('should save statistic', () => {
            return initCliReporter_()
                .then(() => {
                    gemini.emit(gemini.events.END, {some: 'stat'});

                    assert.calledOnceWith(ReportBuilder.prototype.setStats, {some: 'stat'});
                });
        });

        it('should save report', () => {
            return initCliReporter_()
                .then(() => {
                    gemini.emit(gemini.events.END);

                    return gemini.emitAndWait(gemini.events.END_RUNNER).then(() => {
                        assert.calledOnce(ReportBuilder.prototype.save);
                    });
                });
        });

        it('should log correct path to html report', () => {
            return initCliReporter_()
                .then(() => {
                    ReportBuilder.prototype.save.resolves({reportPath: 'some/path'});
                    gemini.emit(gemini.events.END);

                    return gemini.emitAndWait(gemini.events.END_RUNNER).then(() => {
                        assert.calledWithMatch(logger.log, 'some/path');
                    });
                });
        });

        it('should save only reference when screenshots are equal', () => {
            sandbox.stub(utils, 'getReferenceAbsolutePath').returns('absolute/reference/path');

            return initCliReporter_()
                .then(() => {
                    gemini.emit(gemini.events.TEST_RESULT, mkStubResult_({
                        referencePath: 'reference/path',
                        equal: true
                    }));

                    gemini.emit(gemini.events.END);

                    return gemini.emitAndWait(gemini.events.END_RUNNER).then(() => {
                        assert.calledOnceWith(utils.copyImageAsync, 'reference/path', 'absolute/reference/path');
                    });
                });
        });

        it('should handle updated references as success result', () => {
            return initCliReporter_()
                .then(() => {
                    gemini.emit(gemini.events.UPDATE_RESULT, mkStubResult_({updated: true}));

                    assert.calledOnceWith(ReportBuilder.prototype.addSuccess, sinon.match({updated: true}));
                });
        });

        it('should save updated images', () => {
            return initCliReporter_()
                .then(() => {
                    sandbox.stub(utils, 'getReferenceAbsolutePath').returns('absolute/reference/path');

                    gemini.emit(gemini.events.UPDATE_RESULT, mkStubResult_({
                        imagePath: 'updated/image/path'
                    }));

                    gemini.emit(gemini.events.END);

                    return gemini.emitAndWait(gemini.events.END_RUNNER).then(() => {
                        assert.calledOnceWith(utils.copyImageAsync, 'updated/image/path', 'absolute/reference/path');
                    });
                });
        });

        describe('when screenshots are not equal', () => {
            function emitResult_(options) {
                gemini.emit(gemini.events.TEST_RESULT, mkStubResult_(options));
                gemini.emit(gemini.events.END);
                return gemini.emitAndWait(gemini.events.END_RUNNER);
            }

            it('should save current image', () => {
                return initCliReporter_()
                    .then(() => {
                        sandbox.stub(utils, 'getCurrentAbsolutePath').returns('/absolute/report/current/path');

                        return emitResult_({currentPath: 'current/path'})
                            .then(() => {
                                assert.calledWith(utils.copyImageAsync, 'current/path', '/absolute/report/current/path');
                            });
                    });
            });

            it('should save reference image', () => {
                return initCliReporter_()
                    .then(() => {
                        sandbox.stub(utils, 'getReferenceAbsolutePath').returns('/absolute/report/reference/path');

                        return emitResult_({referencePath: 'reference/path'})
                            .then(() => {
                                assert.calledWith(utils.copyImageAsync, 'reference/path', '/absolute/report/reference/path');
                            });
                    });
            });

            it('should save diff image', () => {
                return initCliReporter_()
                    .then(() => {
                        const saveDiffTo = sandbox.stub();

                        sandbox.stub(utils, 'getDiffAbsolutePath').returns('/absolute/report/diff/path');

                        return emitResult_({saveDiffTo})
                            .then(() => {
                                assert.calledWith(saveDiffTo, '/absolute/report/diff/path');
                            });
                    });
            });
        });
    });
});
