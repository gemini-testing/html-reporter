'use strict';

const {EventEmitter} = require('events');
const _ = require('lodash');
const fs = require('fs-extra');
const QEmitter = require('qemitter');
const proxyquire = require('proxyquire');
const utils = require('../lib/server-utils');
const ReportBuilder = require('../lib/report-builder-factory/report-builder');
const {logger} = utils;

describe('Gemini Reporter', () => {
    const sandbox = sinon.sandbox.create();
    let parseConfig;
    let gemini;
    let GeminiReporter;
    let geminiGui;
    let commander;

    const events = {
        CLI: 'cli',
        END_RUNNER: 'endRunner',
        END: 'end',
        RETRY: 'retry',
        SKIP_STATE: 'skipState',
        ERROR: 'err',
        TEST_RESULT: 'testResult',
        UPDATE_RESULT: 'updateResult'
    };

    function initReporter_(opts, command = 'foo') {
        opts = _.defaults(opts || {}, {
            enabled: true,
            path: 'default-path',
            baseHost: ''
        });
        parseConfig.returns(opts);

        GeminiReporter(mkGemini_(), opts);

        const commander = mkCommander_(command);
        gemini.emit(events.CLI, commander);
        commander.emit(`command:${command}`);
    }

    function mkGemini_() {
        gemini = new QEmitter();
        gemini.config = {
            forBrowser: sinon.stub().returns({
                rootUrl: 'browser/root/url',
                getAbsoluteUrl: _.noop
            })
        };
        gemini.events = events;

        return gemini;
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
        initReporter_({path: 'some/path', enabled: false, baseHost: 'some-host'});

        assert.calledWith(parseConfig, {path: 'some/path', enabled: false, baseHost: 'some-host'});
    });

    describe('gui', () => {
        it('should register gui command on "CLI" event', () => {
            gemini = mkGemini_();
            const opts = {enabled: true};
            const commander = mkCommander_('gui');

            parseConfig.withArgs(opts).returns(opts);
            GeminiReporter(gemini, opts);

            gemini.emit(events.CLI, commander);

            assert.calledOnceWith(geminiGui, commander, gemini, opts);
        });

        it('should not init html reporter on running gui command', () => {
            gemini = mkGemini_();
            GeminiReporter(gemini, {enabled: true});
            const commander = mkCommander_('gui');

            gemini.emit(events.CLI, commander);
            commander.emit('command:gui');

            assert.notCalled(ReportBuilder.create);
        });
    });

    describe('html-reporter', () => {
        it('should save statistic', () => {
            initReporter_();

            gemini.emit(events.END, {some: 'stat'});

            assert.calledOnceWith(ReportBuilder.prototype.setStats, {some: 'stat'});
        });

        it('should save report', () => {
            initReporter_();

            gemini.emit(events.END);

            return gemini.emitAndWait(events.END_RUNNER).then(() => {
                assert.calledOnce(ReportBuilder.prototype.save);
            });
        });

        it('should log correct path to html report', () => {
            initReporter_();
            ReportBuilder.prototype.save.resolves({reportPath: 'some/path'});
            gemini.emit(events.END);

            return gemini.emitAndWait(events.END_RUNNER).then(() => {
                assert.calledWithMatch(logger.log, 'some/path');
            });
        });

        it('should save only reference when screenshots are equal', () => {
            sandbox.stub(utils, 'getReferenceAbsolutePath').returns('absolute/reference/path');

            gemini.emit(events.TEST_RESULT, mkStubResult_({
                referencePath: 'reference/path',
                equal: true
            }));

            gemini.emit(events.END);

            return gemini.emitAndWait(events.END_RUNNER).then(() => {
                assert.calledOnceWith(utils.copyImageAsync, 'reference/path', 'absolute/reference/path');
            });
        });

        it('should handle updated references as success result', () => {
            gemini.emit(events.UPDATE_RESULT, mkStubResult_({updated: true}));

            assert.calledOnceWith(ReportBuilder.prototype.addSuccess, sinon.match({updated: true}));
        });

        it('should save updated images', () => {
            sandbox.stub(utils, 'getReferenceAbsolutePath').returns('absolute/reference/path');

            gemini.emit(events.UPDATE_RESULT, mkStubResult_({
                imagePath: 'updated/image/path'
            }));

            gemini.emit(events.END);

            return gemini.emitAndWait(events.END_RUNNER).then(() => {
                assert.calledOnceWith(utils.copyImageAsync, 'updated/image/path', 'absolute/reference/path');
            });
        });

        describe('when screenshots are not equal', () => {
            function emitResult_(options) {
                gemini.emit(events.TEST_RESULT, mkStubResult_(options));
                gemini.emit(events.END);
                return gemini.emitAndWait(events.END_RUNNER);
            }

            it('should save current image', () => {
                sandbox.stub(utils, 'getCurrentAbsolutePath').returns('/absolute/report/current/path');

                return emitResult_({currentPath: 'current/path'})
                    .then(() => {
                        assert.calledWith(utils.copyImageAsync, 'current/path', '/absolute/report/current/path');
                    });
            });

            it('should save reference image', () => {
                sandbox.stub(utils, 'getReferenceAbsolutePath').returns('/absolute/report/reference/path');

                return emitResult_({referencePath: 'reference/path'})
                    .then(() => {
                        assert.calledWith(utils.copyImageAsync, 'reference/path', '/absolute/report/reference/path');
                    });
            });

            it('should save diff image', () => {
                initReporter_();
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
