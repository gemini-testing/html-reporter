'use strict';

const fs = require('fs-extra');
const _ = require('lodash');
const {logger} = require('../../../utils');
const ReportBuilder = require('../../../lib/report-builder-factory/report-builder');

describe('ReportBuilder', () => {
    const sandbox = sinon.sandbox.create();

    const mkReportBuilder_ = (toolConfig, pluginConfig) => {
        toolConfig = _.defaults(toolConfig, {getAbsoluteUrl: _.noop});
        pluginConfig = _.defaults(pluginConfig, {baseHost: ''});

        const browserConfigStub = {getAbsoluteUrl: toolConfig.getAbsoluteUrl};
        const config = {forBrowser: sandbox.stub().returns(browserConfigStub)};

        return new ReportBuilder(config, pluginConfig, {create: (obj) => obj});
    };

    const getReportBuilderResult_ = (reportBuilder) => reportBuilder.getResult().suites[0].children[0].browsers[0].result;

    const stubTest_ = (opts) => {
        opts = opts || {};

        return _.defaultsDeep(opts, {
            state: {name: 'name-default'},
            suite: {
                path: ['suite'],
                metaInfo: {sessionId: 'sessionId-default'},
                file: 'default/path/file.js',
                getUrl: () => opts.suite.url || ''
            },
            imageDir: ''
        });
    };

    beforeEach(() => {
        sandbox.stub(fs, 'mkdirsAsync').returns(Promise.resolve());
        sandbox.stub(fs, 'writeFileAsync').returns(Promise.resolve());
        sandbox.stub(fs, 'copyAsync').returns(Promise.resolve());
    });

    afterEach(() => sandbox.restore());

    it('should contain "file" in "metaInfo"', () => {
        const reportBuilder = mkReportBuilder_();

        reportBuilder.addSuccess(stubTest_({
            suite: {file: '/path/file.js'}
        }));

        const metaInfo = getReportBuilderResult_(reportBuilder).metaInfo;

        assert.equal(metaInfo.file, '/path/file.js');
    });

    it('should contain "url" in "metaInfo"', () => {
        const reportBuilder = mkReportBuilder_();

        reportBuilder.addSuccess(stubTest_({
            suite: {fullUrl: '/test/url'}
        }));

        const metaInfo = getReportBuilderResult_(reportBuilder).metaInfo;

        assert.equal(metaInfo.url, '/test/url');
    });

    it('should set passed statistic', () => {
        const reportBuilder = mkReportBuilder_();

        reportBuilder.setStats({foo: 'bar'});

        assert.match(reportBuilder.getResult(), {foo: 'bar'});
    });

    it('should add skipped test to result', () => {
        const reportBuilder = mkReportBuilder_();

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
    });

    it('should add success test to result', () => {
        const reportBuilder = mkReportBuilder_();

        reportBuilder.addSuccess(stubTest_({
            browserId: 'bro1',
            imageDir: 'some-image-dir'
        }));

        assert.match(getReportBuilderResult_(reportBuilder), {
            success: true,
            actualPath: 'images/some-image-dir/bro1~current.png',
            expectedPath: 'images/some-image-dir/bro1~ref.png'
        });
    });

    it('should add failed test to result', () => {
        const reportBuilder = mkReportBuilder_();

        reportBuilder.addFail(stubTest_({
            browserId: 'bro1',
            imageDir: 'some-image-dir'
        }));

        assert.match(getReportBuilderResult_(reportBuilder), {
            fail: true,
            actualPath: 'images/some-image-dir/bro1~current.png',
            expectedPath: 'images/some-image-dir/bro1~ref.png'
        });
    });

    it('should add error test to result', () => {
        const reportBuilder = mkReportBuilder_();

        reportBuilder.addError(stubTest_({error: 'some-stack-trace'}));

        assert.match(getReportBuilderResult_(reportBuilder), {
            error: true,
            reason: 'some-stack-trace'
        });
    });

    it('should add base host to result with value from plugin parameter "baseHost"', () => {
        const reportBuilder = mkReportBuilder_({}, {baseHost: 'some-host'});

        assert.equal(reportBuilder.getResult().config.baseHost, 'some-host');
    });

    describe('addRetry', () => {
        it('should add fail to result if test result has not equal images', () => {
            const reportBuilder = mkReportBuilder_();

            reportBuilder.addRetry(stubTest_({isEqual: () => true}));

            assert.match(getReportBuilderResult_(reportBuilder), {fail: true});
        });

        it('should add error to result if test result has no image', () => {
            const reportBuilder = mkReportBuilder_();

            reportBuilder.addRetry(stubTest_({isEqual: () => false}));

            assert.match(getReportBuilderResult_(reportBuilder), {error: true});
        });
    });

    describe('save', () => {
        beforeEach(() => {
            sandbox.stub(ReportBuilder.prototype, 'getResult');
            sandbox.stub(logger, 'warn');
        });

        it('should save data with tests result to passed dir', () => {
            ReportBuilder.prototype.getResult.returns({test1: 'some-data'});
            const reportBuilder = mkReportBuilder_({}, {path: 'some/report/dir'});

            return reportBuilder.save().then(() => {
                const expectedData = 'var data = {"test1":"some-data"};\n'
                    + 'try { module.exports = data; } catch(e) {}';

                assert.calledWith(fs.mkdirsAsync, 'some/report/dir');
                assert.calledWith(fs.writeFileAsync, 'some/report/dir/data.js', expectedData, 'utf8');
            });
        });

        it('should copy static files to report dir', () => {
            ReportBuilder.prototype.getResult.returns({test1: 'some-data'});
            const reportBuilder = mkReportBuilder_({}, {path: 'some/report/dir'});

            return reportBuilder.save('some-data', 'some/report/dir')
                .then(() => {
                    assert.calledWithMatch(fs.copyAsync, 'index.html', 'some/report/dir/index.html');
                    assert.calledWithMatch(fs.copyAsync, 'report.min.js', 'some/report/dir/report.min.js');
                    assert.calledWithMatch(fs.copyAsync, 'report.min.css', 'some/report/dir/report.min.css');
                });
        });

        it('should log an error', () => {
            fs.mkdirsAsync.returns(Promise.reject('some-error'));
            const reportBuilder = mkReportBuilder_();

            return reportBuilder.save().then(() => assert.calledWith(logger.warn, 'some-error'));
        });
    });
});
