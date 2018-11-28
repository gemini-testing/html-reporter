'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var _ = require('lodash');
var fs = require('fs-extra');
var HermioneReporter = require('../hermione');
var PluginAdapter = require('lib/plugin-adapter');
var ReportBuilder = require('lib/report-builder-factory/report-builder');
var utils = require('../lib/server-utils');
var stubTool = require('./utils').stubTool;
describe('lib/hermione', function () {
    var sandbox = sinon.createSandbox();
    var hermione;
    var events = {
        INIT: 'init',
        TEST_PENDING: 'testPending',
        TEST_PASS: 'testPass',
        TEST_FAIL: 'testFail',
        RETRY: 'retry',
        RUNNER_END: 'runnerEnd'
    };
    var ImageDiffError = /** @class */ (function (_super) {
        __extends(ImageDiffError, _super);
        function ImageDiffError() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return ImageDiffError;
    }(Error));
    var NoRefImageError = /** @class */ (function (_super) {
        __extends(NoRefImageError, _super);
        function NoRefImageError() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return NoRefImageError;
    }(Error));
    function mkHermione_() {
        return stubTool({
            forBrowser: sinon.stub().returns({
                rootUrl: 'browser/root/url',
                getAbsoluteUrl: _.noop
            }),
            getBrowserIds: function () { return ['bro1']; }
        }, events, { ImageDiffError: ImageDiffError, NoRefImageError: NoRefImageError });
    }
    function initReporter_(opts) {
        opts = _.defaults(opts, {
            enabled: true,
            path: 'default-path',
            baseHost: ''
        });
        HermioneReporter(hermione, opts);
        return hermione.emitAndWait(hermione.events.INIT);
    }
    function mkStubResult_(options) {
        if (options === void 0) { options = {}; }
        return _.defaultsDeep(options, {
            err: {
                type: options.diff && 'ImageDiffError',
                stateName: options.stateName
            }
        });
    }
    beforeEach(function () {
        hermione = mkHermione_();
        sandbox.spy(PluginAdapter.prototype, 'addCliCommands');
        sandbox.spy(PluginAdapter.prototype, 'init');
        sandbox.stub(fs, 'mkdirsAsync').resolves();
        sandbox.stub(fs, 'writeFileAsync').resolves();
        sandbox.stub(fs, 'copyAsync').resolves();
        sandbox.stub(utils, 'copyImageAsync');
        sandbox.stub(utils, 'getCurrentAbsolutePath');
        sandbox.stub(utils, 'getReferenceAbsolutePath');
        sandbox.stub(utils, 'saveDiff');
        sandbox.stub(utils, 'getDiffAbsolutePath');
        sandbox.stub(utils, 'logPathToHtmlReport');
        sandbox.stub(utils.logger, 'log');
        sandbox.stub(utils.logger, 'warn');
        sandbox.spy(ReportBuilder.prototype, 'setStats');
        sandbox.stub(ReportBuilder.prototype, 'addSkipped');
        sandbox.stub(ReportBuilder.prototype, 'addSuccess');
        sandbox.stub(ReportBuilder.prototype, 'addError');
        sandbox.stub(ReportBuilder.prototype, 'addFail');
        sandbox.stub(ReportBuilder.prototype, 'addRetry');
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
    it('should add skipped test to result', function () {
        return initReporter_()
            .then(function () {
            hermione.emit(events.TEST_PENDING, { title: 'some-title' });
            assert.calledOnceWith(ReportBuilder.prototype.addSkipped, { title: 'some-title' });
        });
    });
    it('should add passed test to result', function () {
        return initReporter_()
            .then(function () {
            hermione.emit(events.TEST_PASS, { title: 'some-title' });
            assert.calledOnceWith(ReportBuilder.prototype.addSuccess, { title: 'some-title' });
        });
    });
    ['TEST_FAIL', 'RETRY'].forEach(function (event) {
        describe('should add', function () {
            it("errored test to result on " + event + " event", function () {
                return initReporter_()
                    .then(function () {
                    var testResult = mkStubResult_({ title: 'some-title', stateName: 'state-name' });
                    hermione.emit(events[event], testResult);
                    assert.calledOnceWith(ReportBuilder.prototype.addError, sinon.match({ title: 'some-title' }));
                });
            });
            it("errored assert view to result on " + event + " event", function () {
                return initReporter_()
                    .then(function () {
                    var err = new Error();
                    err.stateName = 'state-name';
                    hermione.emit(events[event], { title: 'some-title', assertViewResults: [err] });
                    assert.calledOnceWith(ReportBuilder.prototype.addError, sinon.match({ title: 'some-title' }));
                });
            });
            it("failed test to result on " + event + " event", function () {
                return initReporter_()
                    .then(function () {
                    var err = new ImageDiffError();
                    err.stateName = 'state-name';
                    var testResult = mkStubResult_({
                        title: 'some-title',
                        assertViewResults: [err]
                    });
                    hermione.emit(events[event], testResult);
                    assert.calledOnceWith(ReportBuilder.prototype.addFail, sinon.match({ title: 'some-title' }));
                });
            });
            it("failed test to result on " + event + " event", function () {
                return initReporter_()
                    .then(function () {
                    var err = new ImageDiffError();
                    err.stateName = 'state-name';
                    hermione.emit(events[event], { title: 'some-title', assertViewResults: [err] });
                    assert.calledOnceWith(ReportBuilder.prototype.addFail, sinon.match({ title: 'some-title' }));
                });
            });
        });
    });
    it('should save statistic', function () {
        return initReporter_()
            .then(function () { return hermione.emitAndWait(hermione.events.RUNNER_END, { some: 'stat' }); })
            .then(function () { return assert.calledOnceWith(ReportBuilder.prototype.setStats, { some: 'stat' }); });
    });
    it('should save image from passed test', function () {
        utils.getReferenceAbsolutePath.callsFake(function (test, path, stateName) { return path + "/report/" + stateName; });
        return initReporter_({ path: '/absolute' })
            .then(function () {
            var testData = { assertViewResults: [{ refImagePath: 'ref/path', stateName: 'plain' }] };
            hermione.emit(events.TEST_PASS, testData);
            return hermione.emitAndWait(events.RUNNER_END);
        })
            .then(function () { return assert.calledOnceWith(utils.copyImageAsync, 'ref/path', '/absolute/report/plain'); });
    });
    it('should save image from assert view error', function () {
        utils.getCurrentAbsolutePath.callsFake(function (test, path, stateName) { return path + "/report/" + stateName; });
        return initReporter_({ path: '/absolute' })
            .then(function () {
            var err = new NoRefImageError();
            err.stateName = 'plain';
            err.currentImagePath = 'current/path';
            hermione.emit(events.RETRY, { assertViewResults: [err] });
            return hermione.emitAndWait(events.RUNNER_END);
        })
            .then(function () { return assert.calledOnceWith(utils.copyImageAsync, 'current/path', '/absolute/report/plain'); });
    });
    it('should save reference image from assert view fail', function () {
        utils.getReferenceAbsolutePath.callsFake(function (test, path) { return path + "/report"; });
        return initReporter_({ path: '/absolute' })
            .then(function () {
            var err = new ImageDiffError();
            err.stateName = 'some-name';
            err.refImagePath = 'reference/path';
            hermione.emit(events.TEST_FAIL, { assertViewResults: [err] });
            return hermione.emitAndWait(events.RUNNER_END);
        })
            .then(function () { return assert.calledWith(utils.copyImageAsync, 'reference/path', '/absolute/report'); });
    });
    it('should save current image from assert view fail', function () {
        utils.getCurrentAbsolutePath.callsFake(function (test, path) { return path + "/report"; });
        return initReporter_({ path: '/absolute' })
            .then(function () {
            var err = new ImageDiffError();
            err.stateName = 'some-name';
            err.currentImagePath = 'current/path';
            hermione.emit(events.TEST_FAIL, { assertViewResults: [err] });
            return hermione.emitAndWait(events.RUNNER_END);
        })
            .then(function () { return assert.calledWith(utils.copyImageAsync, 'current/path', '/absolute/report'); });
    });
    it('should save current diff image from assert view fail', function () {
        utils.getDiffAbsolutePath.callsFake(function (test, path) { return path + "/report"; });
        return initReporter_({ path: '/absolute' })
            .then(function () {
            var err = new ImageDiffError();
            err.stateName = 'some-name';
            err.saveDiffTo = sinon.stub();
            hermione.emit(events.TEST_FAIL, { assertViewResults: [err] });
            return hermione.emitAndWait(events.RUNNER_END);
        })
            .then(function () { return assert.calledWith(utils.saveDiff, sinon.match.instanceOf(ImageDiffError), '/absolute/report'); });
    });
});
//# sourceMappingURL=hermione.js.map