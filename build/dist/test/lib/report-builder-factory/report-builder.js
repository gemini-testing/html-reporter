'use strict';
var fs = require('fs-extra');
var _ = require('lodash');
var serverUtils = require('../../../lib/server-utils');
var logger = serverUtils.logger;
var proxyquire = require('proxyquire');
var _a = require('../../../lib/constants/test-statuses'), SUCCESS = _a.SUCCESS, FAIL = _a.FAIL, ERROR = _a.ERROR, SKIPPED = _a.SKIPPED, IDLE = _a.IDLE, UPDATED = _a.UPDATED;
var getCommonErrors = require('lib/constants/errors').getCommonErrors;
var NO_REF_IMAGE_ERROR = getCommonErrors().NO_REF_IMAGE_ERROR;
describe('ReportBuilder', function () {
    var sandbox = sinon.sandbox.create();
    var hasImage, ReportBuilder;
    var mkReportBuilder_ = function (_a) {
        var _b = _a === void 0 ? {} : _a, toolConfig = _b.toolConfig, pluginConfig = _b.pluginConfig;
        toolConfig = _.defaults(toolConfig || {}, { getAbsoluteUrl: _.noop });
        pluginConfig = _.defaults(pluginConfig || {}, { baseHost: '', path: '' });
        var browserConfigStub = { getAbsoluteUrl: toolConfig.getAbsoluteUrl };
        var config = { forBrowser: sandbox.stub().returns(browserConfigStub) };
        return new ReportBuilder(config, pluginConfig, { create: function (obj) { return obj; } });
    };
    var getReportBuilderResult_ = function (reportBuilder) { return reportBuilder.getResult().suites[0].children[0].browsers[0].result; };
    var stubTest_ = function (opts) {
        if (opts === void 0) { opts = {}; }
        var _a = opts.imagesInfo, imagesInfo = _a === void 0 ? [] : _a;
        return _.defaultsDeep(opts, {
            state: { name: 'name-default' },
            suite: {
                path: ['suite'],
                metaInfo: { sessionId: 'sessionId-default' },
                file: 'default/path/file.js',
                getUrl: function () { return opts.suite.url || ''; }
            },
            imageDir: '',
            imagesInfo: imagesInfo,
            getImagesInfo: function () { return imagesInfo; }
        });
    };
    beforeEach(function () {
        sandbox.stub(fs, 'copyAsync').resolves();
        sandbox.stub(fs, 'mkdirsAsync').resolves();
        sandbox.stub(fs, 'mkdirsSync');
        sandbox.stub(fs, 'writeFileAsync').resolves();
        sandbox.stub(fs, 'writeFileSync');
        sandbox.stub(serverUtils, 'prepareCommonJSData');
        hasImage = sandbox.stub().returns(true);
        ReportBuilder = proxyquire('../../../lib/report-builder-factory/report-builder', {
            '../server-utils': {
                hasImage: hasImage
            }
        });
    });
    afterEach(function () { return sandbox.restore(); });
    it('should contain "file" in "metaInfo"', function () {
        var reportBuilder = mkReportBuilder_();
        reportBuilder.addSuccess(stubTest_({
            suite: { file: '/path/file.js' }
        }));
        var metaInfo = getReportBuilderResult_(reportBuilder).metaInfo;
        assert.equal(metaInfo.file, '/path/file.js');
    });
    it('should contain "url" in "metaInfo"', function () {
        var reportBuilder = mkReportBuilder_();
        reportBuilder.addSuccess(stubTest_({
            suite: { fullUrl: '/test/url' }
        }));
        var metaInfo = getReportBuilderResult_(reportBuilder).metaInfo;
        assert.equal(metaInfo.url, '/test/url');
    });
    it('should contain values from meta in meta info', function () {
        var reportBuilder = mkReportBuilder_();
        reportBuilder.addSuccess(stubTest_({
            meta: { some: 'value' }
        }));
        var metaInfo = getReportBuilderResult_(reportBuilder).metaInfo;
        assert.match(metaInfo, { some: 'value' });
    });
    it('should contain "name" for each suite', function () {
        var reportBuilder = mkReportBuilder_();
        reportBuilder.addSuccess(stubTest_({
            state: { name: 'some-state' },
            suite: { path: ['root-suite'] }
        }));
        var result = reportBuilder.getResult();
        var suiteResult = result.suites[0];
        var stateResult = suiteResult.children[0];
        assert.propertyVal(suiteResult, 'name', 'root-suite');
        assert.propertyVal(stateResult, 'name', 'some-state');
    });
    it('should set passed statistic', function () {
        var reportBuilder = mkReportBuilder_();
        reportBuilder.setStats({ foo: 'bar' });
        assert.match(reportBuilder.getResult(), { foo: 'bar' });
    });
    it('should add skipped test to result', function () {
        var reportBuilder = mkReportBuilder_();
        reportBuilder.addSkipped(stubTest_({
            browserId: 'bro1',
            suite: {
                skipComment: 'some skip comment',
                fullName: 'suite-full-name'
            }
        }));
        assert.deepEqual(reportBuilder.getResult().skips, [{
                suite: 'suite-full-name',
                browser: 'bro1',
                comment: 'some skip comment'
            }]);
        assert.equal(getReportBuilderResult_(reportBuilder).status, SKIPPED);
    });
    it('should add success test to result', function () {
        var reportBuilder = mkReportBuilder_();
        reportBuilder.addSuccess(stubTest_({
            browserId: 'bro1'
        }));
        assert.match(getReportBuilderResult_(reportBuilder), {
            status: SUCCESS,
            name: 'bro1'
        });
    });
    it('should add failed test to result', function () {
        var reportBuilder = mkReportBuilder_();
        reportBuilder.addFail(stubTest_({
            browserId: 'bro1',
            imageDir: 'some-image-dir'
        }));
        assert.match(getReportBuilderResult_(reportBuilder), {
            status: FAIL,
            name: 'bro1'
        });
    });
    it('should add error test to result', function () {
        var reportBuilder = mkReportBuilder_();
        reportBuilder.addError(stubTest_({ error: 'some-stack-trace' }));
        assert.match(getReportBuilderResult_(reportBuilder), {
            status: ERROR,
            reason: 'some-stack-trace'
        });
    });
    it('should get correct test attempt while checking for image exists', function () {
        var reportBuilder = mkReportBuilder_();
        var testResult = stubTest_();
        reportBuilder.addError(testResult);
        var firstCallAttempt = hasImage.firstCall.args[0].attempt;
        reportBuilder.addError(testResult);
        var secondCallAttempt = hasImage.secondCall.args[0].attempt;
        assert.equal(firstCallAttempt, 0);
        assert.equal(secondCallAttempt, 1);
    });
    it('should add base host to result with value from plugin parameter "baseHost"', function () {
        var reportBuilder = mkReportBuilder_({ pluginConfig: { baseHost: 'some-host' } });
        assert.equal(reportBuilder.getResult().config.baseHost, 'some-host');
    });
    describe('suite statuses', function () {
        var getSuiteResult_ = function (reportBuilder) { return reportBuilder.getResult().suites[0].children[0]; };
        it('should set status for suite if suite status does not exist', function () {
            var reportBuilder = mkReportBuilder_();
            reportBuilder.addSuccess(stubTest_({ browserId: 'bro' }));
            var suiteResult = getSuiteResult_(reportBuilder);
            assert.equal(suiteResult.status, SUCCESS);
        });
        it('should rewrite suite status if new status has "failed" type', function () {
            var reportBuilder = mkReportBuilder_();
            reportBuilder.addSuccess(stubTest_({ browserId: 'bro' }));
            reportBuilder.addError(stubTest_({ browserId: 'another-bro' }));
            var suiteResult = getSuiteResult_(reportBuilder);
            assert.equal(suiteResult.status, ERROR);
        });
        it('should rewrite suite status if new status has "forced" type', function () {
            var reportBuilder = mkReportBuilder_();
            reportBuilder.addFail(stubTest_({ browserId: 'bro' }));
            reportBuilder.addIdle(stubTest_({ browserId: 'another-bro' }));
            var suiteResult = getSuiteResult_(reportBuilder);
            assert.equal(suiteResult.status, IDLE);
        });
        it('should rewrite suite status if new status has "final" result', function () {
            var reportBuilder = mkReportBuilder_();
            reportBuilder.addIdle(stubTest_({ browserId: 'another-bro' }));
            reportBuilder.addSuccess(stubTest_({ browserId: 'bro' }));
            var suiteResult = getSuiteResult_(reportBuilder);
            assert.equal(suiteResult.status, SUCCESS);
        });
        it('should not rewrite suite status to "success" if it has failed state', function () {
            var reportBuilder = mkReportBuilder_();
            reportBuilder.addFail(stubTest_({ browserId: 'bro' }));
            reportBuilder.addSuccess(stubTest_({ browserId: 'another-bro' }));
            var suiteResult = getSuiteResult_(reportBuilder);
            assert.equal(suiteResult.status, FAIL);
        });
        [
            { status: 'failed', hasDiff: true },
            { status: 'errored', hasDiff: false }
        ].forEach(function (_a) {
            var status = _a.status, hasDiff = _a.hasDiff;
            it("should rewrite suite status to \"success\" if it " + status + " on first attempt", function () {
                var reportBuilder = mkReportBuilder_();
                var test1 = stubTest_({ browserId: 'bro', hasDiff: function () { return hasDiff; } });
                var test2 = stubTest_({ browserId: 'bro', hasDiff: function () { return hasDiff; } });
                reportBuilder.addRetry(test1);
                reportBuilder.addSuccess(test2);
                var suiteResult = getSuiteResult_(reportBuilder);
                assert.equal(suiteResult.status, SUCCESS);
            });
        });
        describe('should rewrite suite status to "fail" if test failed with no reference image error', function () {
            it('and test does not exist in tests tree', function () {
                var reportBuilder = mkReportBuilder_();
                var test = stubTest_({
                    status: ERROR,
                    imagesInfo: [{
                            stateName: 'plain', status: ERROR,
                            reason: { stack: NO_REF_IMAGE_ERROR + ": ..." }
                        }]
                });
                reportBuilder.addError(test);
                var suiteResult = getSuiteResult_(reportBuilder);
                assert.equal(suiteResult.status, FAIL);
            });
            it('and test exists in tests tree', function () {
                var reportBuilder = mkReportBuilder_();
                var test = stubTest_({
                    status: ERROR,
                    imagesInfo: [{
                            stateName: 'plain', status: ERROR,
                            reason: { stack: NO_REF_IMAGE_ERROR + ": ..." }
                        }]
                });
                reportBuilder.addIdle(test);
                reportBuilder.addError(test);
                var suiteResult = getSuiteResult_(reportBuilder);
                assert.equal(suiteResult.status, FAIL);
            });
        });
        describe('should not rewrite suite status to "success" if image comparison is successful, but test', function () {
            [
                { status: FAIL, methodName: 'addFail' },
                { status: ERROR, methodName: 'addError' }
            ].forEach(function (_a) {
                var status = _a.status, methodName = _a.methodName;
                it(status + "ed", function () {
                    var reportBuilder = mkReportBuilder_();
                    var test = stubTest_({
                        imagesInfo: [{ stateName: 'plain', status: SUCCESS }]
                    });
                    reportBuilder.addIdle(test);
                    reportBuilder[methodName](test);
                    var suiteResult = getSuiteResult_(reportBuilder);
                    assert.equal(suiteResult.status, status);
                });
            });
        });
    });
    describe('addRetry', function () {
        it('should add "fail" status to result if test result has not equal images', function () {
            var reportBuilder = mkReportBuilder_();
            reportBuilder.addRetry(stubTest_({ hasDiff: function () { return true; } }));
            assert.match(getReportBuilderResult_(reportBuilder), { status: FAIL });
        });
        it('should add "error" status to result if test result has no image', function () {
            var reportBuilder = mkReportBuilder_();
            reportBuilder.addRetry(stubTest_({ hasDiff: function () { return false; } }));
            assert.match(getReportBuilderResult_(reportBuilder), { status: ERROR });
        });
    });
    describe('addIdle', function () {
        it('should add "idle" status to result', function () {
            var reportBuilder = mkReportBuilder_();
            reportBuilder.addIdle(stubTest_(), 'some/url');
            var result = getReportBuilderResult_(reportBuilder);
            assert.propertyVal(result, 'status', IDLE);
        });
    });
    describe('addUpdated', function () {
        it('should add "updated" status to result', function () {
            var reportBuilder = mkReportBuilder_();
            reportBuilder.addUpdated(stubTest_());
            var result = getReportBuilderResult_(reportBuilder);
            assert.propertyVal(result, 'status', UPDATED);
        });
        it('should update test image for current state name', function () {
            var reportBuilder = mkReportBuilder_();
            var failedTest = stubTest_({
                imagesInfo: [
                    { stateName: 'plain1', status: FAIL },
                    { stateName: 'plain2', status: FAIL }
                ]
            });
            var updatedTest = stubTest_({
                imagesInfo: [
                    { stateName: 'plain1', status: UPDATED }
                ]
            });
            reportBuilder.addFail(failedTest);
            reportBuilder.addUpdated(updatedTest);
            var imagesInfo = getReportBuilderResult_(reportBuilder).imagesInfo;
            assert.match(imagesInfo[0], { stateName: 'plain1', status: UPDATED });
            assert.match(imagesInfo[1], { stateName: 'plain2', status: FAIL });
        });
        it('should not rewrite status to "updated" if test has failed states', function () {
            var reportBuilder = mkReportBuilder_();
            var failedTest = stubTest_({
                imagesInfo: [
                    { stateName: 'plain1', status: FAIL },
                    { stateName: 'plain2', status: FAIL }
                ]
            });
            var updatedTest = stubTest_({
                imagesInfo: [
                    { stateName: 'plain1', status: UPDATED }
                ]
            });
            reportBuilder.addFail(failedTest);
            reportBuilder.addUpdated(updatedTest);
            var status = getReportBuilderResult_(reportBuilder).status;
            assert.equal(status, FAIL);
        });
        it('should update last test image if state name was not passed', function () {
            var reportBuilder = mkReportBuilder_();
            var failedTest = stubTest_({
                imagesInfo: [
                    { stateName: 'plain1', status: FAIL },
                    { stateName: 'plain2', status: FAIL }
                ]
            });
            var updatedTest = stubTest_({
                imagesInfo: [
                    { status: UPDATED }
                ]
            });
            reportBuilder.addFail(failedTest);
            reportBuilder.addUpdated(updatedTest);
            var imagesInfo = getReportBuilderResult_(reportBuilder).imagesInfo;
            assert.match(imagesInfo[0], { status: FAIL });
            assert.match(imagesInfo[1], { status: UPDATED });
        });
    });
    describe('saveDataFileAsync', function () {
        it('should create report directory asynchronously', function () {
            var reportBuilder = mkReportBuilder_({ pluginConfig: { path: 'some/report/dir' } });
            return reportBuilder.saveDataFileAsync()
                .then(function () { return assert.calledOnceWith(fs.mkdirsAsync, 'some/report/dir'); });
        });
        it('should save data file with tests result asynchronously', function () {
            sandbox.stub(ReportBuilder.prototype, 'getResult').returns({ test1: 'some-data' });
            serverUtils.prepareCommonJSData.returns('some data');
            var reportBuilder = mkReportBuilder_({ pluginConfig: { path: 'some/report/dir' } });
            return reportBuilder.saveDataFileAsync()
                .then(function () { return assert.calledWith(fs.writeFileAsync, 'some/report/dir/data.js', 'some data', 'utf8'); });
        });
        it('should create report directory before save data file', function () {
            var reportBuilder = mkReportBuilder_();
            return reportBuilder.saveDataFileAsync()
                .then(function () { return assert.callOrder(fs.mkdirsAsync, fs.writeFileAsync); });
        });
    });
    describe('saveDataFileSync', function () {
        it('should create report directory synchronously', function () {
            var reportBuilder = mkReportBuilder_({ pluginConfig: { path: 'some/report/dir' } });
            reportBuilder.saveDataFileSync();
            assert.calledOnceWith(fs.mkdirsSync, 'some/report/dir');
        });
        it('should save data file with tests result synchronously', function () {
            sandbox.stub(ReportBuilder.prototype, 'getResult').returns({ test1: 'some-data' });
            serverUtils.prepareCommonJSData.returns('some data');
            var reportBuilder = mkReportBuilder_({ pluginConfig: { path: 'some/report/dir' } });
            reportBuilder.saveDataFileSync();
            assert.calledOnceWith(fs.writeFileSync, 'some/report/dir/data.js', 'some data', 'utf8');
        });
        it('should create report directory before save data file', function () {
            var reportBuilder = mkReportBuilder_();
            reportBuilder.saveDataFileSync();
            assert.callOrder(fs.mkdirsSync, fs.writeFileSync);
        });
    });
    describe('save', function () {
        beforeEach(function () {
            sandbox.stub(logger, 'warn');
        });
        it('should save data file', function () {
            var reportBuilder = mkReportBuilder_({ pluginConfig: { path: 'some/report/dir' } });
            sandbox.stub(reportBuilder, 'saveDataFileAsync').resolves();
            return reportBuilder.save()
                .then(function () { return assert.calledOnce(reportBuilder.saveDataFileAsync); });
        });
        it('should copy static files to report directory', function () {
            var reportBuilder = mkReportBuilder_({ pluginConfig: { path: 'some/report/dir' } });
            return reportBuilder.save()
                .then(function () {
                assert.calledWithMatch(fs.copyAsync, 'index.html', 'some/report/dir/index.html');
                assert.calledWithMatch(fs.copyAsync, 'report.min.js', 'some/report/dir/report.min.js');
                assert.calledWithMatch(fs.copyAsync, 'report.min.css', 'some/report/dir/report.min.css');
            });
        });
        it('should log an error', function () {
            var reportBuilder = mkReportBuilder_();
            sandbox.stub(reportBuilder, 'saveDataFileAsync').rejects(new Error('some-error'));
            return reportBuilder.save().then(function () { return assert.calledWith(logger.warn, 'some-error'); });
        });
    });
});
//# sourceMappingURL=report-builder.js.map