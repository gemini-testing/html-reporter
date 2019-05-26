'use strict';

const _ = require('lodash');
const fs = require('fs-extra');
const GeminiReporter = require('../../gemini');
const PluginAdapter = require('lib/plugin-adapter');
const ReportBuilder = require('lib/report-builder-factory/report-builder');
const utils = require('lib/server-utils');
const {stubTool} = require('./utils');

describe('lib/gemini', () => {
    const sandbox = sinon.createSandbox();
    let gemini;

    const events = {
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
        opts = _.defaults(opts, {
            enabled: true,
            path: 'default-path',
            baseHost: ''
        });

        GeminiReporter(gemini, opts);

        return gemini.emitAndWait(gemini.events.INIT);
    }

    const mkStubResult_ = (options) => {
        return _.defaultsDeep(options, {
            state: {name: 'name-default'},
            browserId: 'browserId-default',
            suite: {
                path: ['suite/path-default'],
                metaInfo: {sessionId: 'sessionId-default'}
            },
            refImg: {path: 'reference/path-default', size: {width: 100500, height: 500100}}
        });
    };

    const mkStubTestResult_ = (options) => {
        return mkStubResult_(_.defaultsDeep(options, {
            saveDiffTo: sandbox.stub(),
            currImg: {path: 'current/path-default', size: {width: 100500, height: 500100}},
            equal: false
        }));
    };

    const mkStubUpdateResult_ = (options) => {
        return mkStubResult_(_.defaults(options, {updated: true}));
    };

    beforeEach(() => {
        gemini = mkGemini_();

        sandbox.spy(PluginAdapter.prototype, 'addApi');
        sandbox.spy(PluginAdapter.prototype, 'addCliCommands');
        sandbox.spy(PluginAdapter.prototype, 'init');

        sandbox.stub(fs, 'mkdirs').resolves();
        sandbox.stub(fs, 'writeFile').resolves();
        sandbox.stub(fs, 'copy').resolves();

        sandbox.stub(utils, 'copyImageAsync');
        sandbox.stub(utils, 'logPathToHtmlReport');
        sandbox.stub(utils.logger, 'log');

        sandbox.spy(ReportBuilder.prototype, 'setStats');
        sandbox.stub(ReportBuilder.prototype, 'addSuccess');
        sandbox.stub(ReportBuilder.prototype, 'setApiValues');
        sandbox.stub(ReportBuilder.prototype, 'save');
    });

    afterEach(() => sandbox.restore());

    it('should do nothing if plugin is disabled', () => {
        return initReporter_({enabled: false}).then(() => {
            assert.notCalled(PluginAdapter.prototype.addCliCommands);
        });
    });

    it('should add api', () => {
        return initReporter_()
            .then(() => assert.calledOnce(PluginAdapter.prototype.addApi));
    });

    it('should add cli commands', () => {
        return initReporter_()
            .then(() => assert.calledOnce(PluginAdapter.prototype.addCliCommands));
    });

    it('should init plugin', () => {
        return initReporter_().then(() => assert.calledOnce(PluginAdapter.prototype.init));
    });

    it('should set values added through api', async () => {
        await initReporter_();

        gemini.htmlReporter.addExtraItem('key1', 'value1');
        gemini.htmlReporter.addMetaInfoExtender('key2', 'value2');

        gemini.emit(gemini.events.END);

        assert.calledOnceWith(ReportBuilder.prototype.setApiValues, {
            extraItems: {key1: 'value1'},
            metaInfoExtenders: {key2: 'value2'}
        });
    });

    it('should save statistic', () => {
        return initReporter_()
            .then(() => {
                gemini.emit(gemini.events.END, {some: 'stat'});

                assert.calledOnceWith(ReportBuilder.prototype.setStats, {some: 'stat'});
            });
    });

    it('should save only reference when screenshots are equal', () => {
        sandbox.stub(utils, 'getReferenceAbsolutePath').returns('absolute/reference/path');

        return initReporter_()
            .then(() => {
                gemini.emit(gemini.events.TEST_RESULT, mkStubTestResult_({
                    refImg: {path: 'reference/path'},
                    equal: true
                }));
                gemini.emit(gemini.events.END);

                return gemini.emitAndWait(gemini.events.END_RUNNER).then(() => {
                    assert.calledOnceWith(utils.copyImageAsync, 'reference/path', 'absolute/reference/path');
                });
            });
    });

    it('should handle updated references as success result', () => {
        return initReporter_()
            .then(() => {
                gemini.emit(gemini.events.UPDATE_RESULT, mkStubUpdateResult_({updated: true}));

                assert.calledOnceWith(ReportBuilder.prototype.addSuccess, sinon.match({updated: true}));
            });
    });

    it('should save updated images', () => {
        return initReporter_()
            .then(() => {
                sandbox.stub(utils, 'getReferenceAbsolutePath').returns('absolute/reference/path');

                gemini.emit(gemini.events.UPDATE_RESULT, mkStubUpdateResult_({
                    refImg: {path: 'updated/image/path'}
                }));
                gemini.emit(gemini.events.END);

                return gemini.emitAndWait(gemini.events.END_RUNNER).then(() => {
                    assert.calledOnceWith(utils.copyImageAsync, 'updated/image/path', 'absolute/reference/path');
                });
            });
    });

    describe('when screenshots are not equal', () => {
        function emitResult_(options) {
            gemini.emit(gemini.events.TEST_RESULT, mkStubTestResult_(options));
            gemini.emit(gemini.events.END);
            return gemini.emitAndWait(gemini.events.END_RUNNER);
        }

        it('should save current image', () => {
            return initReporter_()
                .then(() => {
                    sandbox.stub(utils, 'getCurrentAbsolutePath').returns('/absolute/report/current/path');

                    return emitResult_({currImg: {path: 'current/path'}})
                        .then(() => {
                            assert.calledWith(utils.copyImageAsync, 'current/path', '/absolute/report/current/path');
                        });
                });
        });

        it('should save reference image', () => {
            return initReporter_()
                .then(() => {
                    sandbox.stub(utils, 'getReferenceAbsolutePath').returns('/absolute/report/reference/path');

                    return emitResult_({refImg: {path: 'reference/path'}})
                        .then(() => {
                            assert.calledWith(utils.copyImageAsync, 'reference/path', '/absolute/report/reference/path');
                        });
                });
        });

        it('should save diff image', () => {
            return initReporter_()
                .then(() => {
                    const saveDiffTo = sandbox.stub();

                    sandbox.stub(utils, 'getDiffAbsolutePath').returns('/absolute/report/diff/path');

                    return emitResult_({saveDiffTo})
                        .then(() => assert.calledWith(saveDiffTo, '/absolute/report/diff/path'));
                });
        });
    });
});
