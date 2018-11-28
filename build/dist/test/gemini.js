'use strict';
var _ = require('lodash');
var fs = require('fs-extra');
var GeminiReporter = require('../gemini');
var PluginAdapter = require('lib/plugin-adapter');
var ReportBuilder = require('lib/report-builder-factory/report-builder');
var utils = require('lib/server-utils');
var stubTool = require('./utils').stubTool;
describe('lib/gemini', function () {
    var sandbox = sinon.createSandbox();
    var gemini;
    var events = {
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
                getAbsoluteUrl: function () { }
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
    function mkStubResult_(options) {
        return _.defaultsDeep(options, {
            state: { name: 'name-default' },
            browserId: 'browserId-default',
            suite: {
                path: ['suite/path-default'],
                metaInfo: { sessionId: 'sessionId-default' }
            },
            saveDiffTo: sandbox.stub(),
            currentPath: 'current/path-default',
            referencePath: 'reference/path-default',
            equal: false
        });
    }
    beforeEach(function () {
        gemini = mkGemini_();
        sandbox.spy(PluginAdapter.prototype, 'addCliCommands');
        sandbox.spy(PluginAdapter.prototype, 'init');
        sandbox.stub(fs, 'mkdirsAsync').resolves();
        sandbox.stub(fs, 'writeFileAsync').resolves();
        sandbox.stub(fs, 'copyAsync').resolves();
        sandbox.stub(utils, 'copyImageAsync');
        sandbox.stub(utils, 'logPathToHtmlReport');
        sandbox.stub(utils.logger, 'log');
        sandbox.spy(ReportBuilder.prototype, 'setStats');
        sandbox.stub(ReportBuilder.prototype, 'addSuccess');
        sandbox.stub(ReportBuilder.prototype, 'save');
    });
    afterEach(function () { return sandbox.restore(); });
    it('should do nothing if plugin is disabled', function () {
        return initReporter_({ enabled: false }).then(function () {
            assert.notCalled(PluginAdapter.prototype.addCliCommands);
        });
    });
    it('should add cli commands', function () {
        return initReporter_()
            .then(function () { return assert.calledOnce(PluginAdapter.prototype.addCliCommands); });
    });
    it('should init plugin', function () {
        return initReporter_().then(function () { return assert.calledOnce(PluginAdapter.prototype.init); });
    });
    it('should save statistic', function () {
        return initReporter_()
            .then(function () {
            gemini.emit(gemini.events.END, { some: 'stat' });
            assert.calledOnceWith(ReportBuilder.prototype.setStats, { some: 'stat' });
        });
    });
    it('should save only reference when screenshots are equal', function () {
        sandbox.stub(utils, 'getReferenceAbsolutePath').returns('absolute/reference/path');
        return initReporter_()
            .then(function () {
            gemini.emit(gemini.events.TEST_RESULT, mkStubResult_({
                referencePath: 'reference/path',
                equal: true
            }));
            gemini.emit(gemini.events.END);
            return gemini.emitAndWait(gemini.events.END_RUNNER).then(function () {
                assert.calledOnceWith(utils.copyImageAsync, 'reference/path', 'absolute/reference/path');
            });
        });
    });
    it('should handle updated references as success result', function () {
        return initReporter_()
            .then(function () {
            gemini.emit(gemini.events.UPDATE_RESULT, mkStubResult_({ updated: true }));
            assert.calledOnceWith(ReportBuilder.prototype.addSuccess, sinon.match({ updated: true }));
        });
    });
    it('should save updated images', function () {
        return initReporter_()
            .then(function () {
            sandbox.stub(utils, 'getReferenceAbsolutePath').returns('absolute/reference/path');
            gemini.emit(gemini.events.UPDATE_RESULT, mkStubResult_({
                imagePath: 'updated/image/path'
            }));
            gemini.emit(gemini.events.END);
            return gemini.emitAndWait(gemini.events.END_RUNNER).then(function () {
                assert.calledOnceWith(utils.copyImageAsync, 'updated/image/path', 'absolute/reference/path');
            });
        });
    });
    describe('when screenshots are not equal', function () {
        function emitResult_(options) {
            gemini.emit(gemini.events.TEST_RESULT, mkStubResult_(options));
            gemini.emit(gemini.events.END);
            return gemini.emitAndWait(gemini.events.END_RUNNER);
        }
        it('should save current image', function () {
            return initReporter_()
                .then(function () {
                sandbox.stub(utils, 'getCurrentAbsolutePath').returns('/absolute/report/current/path');
                return emitResult_({ currentPath: 'current/path' })
                    .then(function () {
                    assert.calledWith(utils.copyImageAsync, 'current/path', '/absolute/report/current/path');
                });
            });
        });
        it('should save reference image', function () {
            return initReporter_()
                .then(function () {
                sandbox.stub(utils, 'getReferenceAbsolutePath').returns('/absolute/report/reference/path');
                return emitResult_({ referencePath: 'reference/path' })
                    .then(function () {
                    assert.calledWith(utils.copyImageAsync, 'reference/path', '/absolute/report/reference/path');
                });
            });
        });
        it('should save diff image', function () {
            return initReporter_()
                .then(function () {
                var saveDiffTo = sandbox.stub();
                sandbox.stub(utils, 'getDiffAbsolutePath').returns('/absolute/report/diff/path');
                return emitResult_({ saveDiffTo: saveDiffTo })
                    .then(function () { return assert.calledWith(saveDiffTo, '/absolute/report/diff/path'); });
            });
        });
    });
});
//# sourceMappingURL=gemini.js.map