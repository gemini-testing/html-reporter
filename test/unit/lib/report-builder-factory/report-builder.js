'use strict';

const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const serverUtils = require('lib/server-utils');
const {logger} = serverUtils;
const proxyquire = require('proxyquire');
const {SUCCESS, FAIL, ERROR, SKIPPED, IDLE, UPDATED} = require('lib/constants/test-statuses');
const {getCommonErrors} = require('lib/constants/errors');
const {NO_REF_IMAGE_ERROR} = getCommonErrors();

describe('ReportBuilder', () => {
    const sandbox = sinon.sandbox.create();
    let hasImage, ReportBuilder;

    const mkReportBuilder_ = ({toolConfig, pluginConfig} = {}) => {
        toolConfig = _.defaults(toolConfig || {}, {getAbsoluteUrl: _.noop});
        pluginConfig = _.defaults(pluginConfig || {}, {baseHost: '', path: ''});

        const browserConfigStub = {getAbsoluteUrl: toolConfig.getAbsoluteUrl};
        const config = {forBrowser: sandbox.stub().returns(browserConfigStub)};

        return new ReportBuilder(config, pluginConfig, {create: (obj) => obj});
    };

    const getReportBuilderResult_ = (reportBuilder) => reportBuilder.getResult().suites[0].children[0].browsers[0].result;
    const getReportBuilderRetries_ = (reportBuilder) => reportBuilder.getResult().suites[0].children[0].browsers[0].retries;

    const stubTest_ = (opts = {}) => {
        const {imagesInfo = []} = opts;

        return _.defaultsDeep(opts, {
            state: {name: 'name-default'},
            suite: {
                path: ['suite'],
                metaInfo: {sessionId: 'sessionId-default'},
                file: 'default/path/file.js',
                getUrl: () => opts.suite.url || ''
            },
            imageDir: '',
            imagesInfo,
            getImagesInfo: () => imagesInfo,
            getRefImg: () => ({}),
            getCurrImg: () => ({}),
            getErrImg: () => ({})
        });
    };

    beforeEach(() => {
        sandbox.stub(fs, 'copy').resolves();
        sandbox.stub(fs, 'mkdirs').resolves();
        sandbox.stub(fs, 'mkdirsSync');
        sandbox.stub(fs, 'writeFile').resolves();
        sandbox.stub(fs, 'writeFileSync');
        sandbox.stub(serverUtils, 'prepareCommonJSData');

        hasImage = sandbox.stub().returns(true);
        ReportBuilder = proxyquire('lib/report-builder-factory/report-builder', {
            '../server-utils': {
                hasImage
            }
        });
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

    it('should contain values from meta in meta info', () => {
        const reportBuilder = mkReportBuilder_();

        reportBuilder.addSuccess(stubTest_({
            meta: {some: 'value'}
        }));

        const metaInfo = getReportBuilderResult_(reportBuilder).metaInfo;

        assert.match(metaInfo, {some: 'value'});
    });

    it('should do not duplicate sessionId from meta in meta info', () => {
        const reportBuilder = mkReportBuilder_();

        const test = stubTest_({
            meta: {sessionId: 'sessionId-retry'},
            hasDiff: () => false
        });
        reportBuilder.addRetry(test);

        test.meta.sessionId = 'sessionId-fail';
        reportBuilder.addFail(test);

        const result = getReportBuilderResult_(reportBuilder);
        const retry = getReportBuilderRetries_(reportBuilder)[0];

        assert.equal(retry.metaInfo.sessionId, 'sessionId-retry');
        assert.equal(result.metaInfo.sessionId, 'sessionId-fail');
    });

    it('should contain "name" for each suite', () => {
        const reportBuilder = mkReportBuilder_();

        reportBuilder.addSuccess(stubTest_({
            state: {name: 'some-state'},
            suite: {path: ['root-suite']}
        }));

        const result = reportBuilder.getResult();
        const suiteResult = result.suites[0];
        const stateResult = suiteResult.children[0];

        assert.propertyVal(suiteResult, 'name', 'root-suite');
        assert.propertyVal(stateResult, 'name', 'some-state');
    });

    it('should set passed statistic', () => {
        const reportBuilder = mkReportBuilder_();

        reportBuilder.setStats({foo: 'bar'});

        assert.match(reportBuilder.getResult(), {foo: 'bar'});
    });

    it('should set values added through api', () => {
        const reportBuilder = mkReportBuilder_();

        reportBuilder.setApiValues({key: 'value'});

        assert.deepEqual(reportBuilder.getResult().apiValues, {key: 'value'});
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
        assert.equal(getReportBuilderResult_(reportBuilder).status, SKIPPED);
    });

    it('should add success test to result', () => {
        const reportBuilder = mkReportBuilder_();

        reportBuilder.addSuccess(stubTest_({
            browserId: 'bro1'
        }));

        assert.match(getReportBuilderResult_(reportBuilder), {
            status: SUCCESS,
            name: 'bro1'
        });
    });

    it('should add failed test to result', () => {
        const reportBuilder = mkReportBuilder_();

        reportBuilder.addFail(stubTest_({
            browserId: 'bro1',
            imageDir: 'some-image-dir'
        }));

        assert.match(getReportBuilderResult_(reportBuilder), {
            status: FAIL,
            name: 'bro1'
        });
    });

    it('should add error test to result', () => {
        const reportBuilder = mkReportBuilder_();

        reportBuilder.addError(stubTest_({error: 'some-stack-trace'}));

        assert.match(getReportBuilderResult_(reportBuilder), {
            status: ERROR,
            error: 'some-stack-trace'
        });
    });

    it('should get correct test attempt while checking for image exists', () => {
        const reportBuilder = mkReportBuilder_();
        const testResult = stubTest_();

        reportBuilder.addError(testResult);
        const firstCallAttempt = hasImage.firstCall.args[0].attempt;
        reportBuilder.addError(testResult);
        const secondCallAttempt = hasImage.secondCall.args[0].attempt;

        assert.equal(firstCallAttempt, 0);
        assert.equal(secondCallAttempt, 1);
    });

    it('should add base host to result with value from plugin parameter "baseHost"', () => {
        const reportBuilder = mkReportBuilder_({pluginConfig: {baseHost: 'some-host'}});

        assert.equal(reportBuilder.getResult().config.baseHost, 'some-host');
    });

    it('should sort suites by name', () => {
        const reportBuilder = mkReportBuilder_();
        reportBuilder.addSuccess(stubTest_({state: {name: 'some-state'}}));
        reportBuilder.addSuccess(stubTest_({state: {name: 'other-state'}}));

        const names = _.map(reportBuilder.getResult().suites[0].children, 'name');

        assert.sameOrderedMembers(names, ['other-state', 'some-state']);
    });

    describe('suite statuses', () => {
        const getSuiteResult_ = (reportBuilder) => reportBuilder.getResult().suites[0].children[0];

        it('should set status for suite if suite status does not exist', () => {
            const reportBuilder = mkReportBuilder_();

            reportBuilder.addSuccess(stubTest_({browserId: 'bro'}));

            const suiteResult = getSuiteResult_(reportBuilder);
            assert.equal(suiteResult.status, SUCCESS);
        });

        describe('for one browser', () => {
            describe('should rewrite status to "skipped" if', () => {
                it('first attempt was "idle"', () => {
                    const reportBuilder = mkReportBuilder_();
                    const test = stubTest_({browserId: 'bro'});

                    reportBuilder.addIdle(test);
                    reportBuilder.addSkipped(test);

                    const suiteResult = getSuiteResult_(reportBuilder);
                    assert.equal(suiteResult.status, SKIPPED);
                });

                it('first attempt was "error"', () => {
                    const reportBuilder = mkReportBuilder_();
                    const test = stubTest_({browserId: 'bro', hasDiff: () => false});

                    reportBuilder.addRetry(test);
                    reportBuilder.addSkipped(test);

                    const suiteResult = getSuiteResult_(reportBuilder);
                    assert.equal(suiteResult.status, SKIPPED);
                });

                it('first attempt was "fail"', () => {
                    const reportBuilder = mkReportBuilder_();
                    const test = stubTest_({browserId: 'bro', hasDiff: () => true});

                    reportBuilder.addRetry(test);
                    reportBuilder.addSkipped(test);

                    const suiteResult = getSuiteResult_(reportBuilder);
                    assert.equal(suiteResult.status, SKIPPED);
                });

                it('first attempt was "updated"', () => {
                    const reportBuilder = mkReportBuilder_();
                    const test = stubTest_({browserId: 'bro', hasDiff: () => true});

                    reportBuilder.addUpdated(test);
                    reportBuilder.addSkipped(test);

                    const suiteResult = getSuiteResult_(reportBuilder);
                    assert.equal(suiteResult.status, SKIPPED);
                });

                it('first attempt was "success"', () => {
                    const reportBuilder = mkReportBuilder_();
                    const test = stubTest_({browserId: 'bro', hasDiff: () => true});

                    reportBuilder.addSuccess(test);
                    reportBuilder.addSkipped(test);

                    const suiteResult = getSuiteResult_(reportBuilder);
                    assert.equal(suiteResult.status, SKIPPED);
                });
            });

            describe('should rewrite status to "success" if', () => {
                it('first attempt was "idle"', () => {
                    const reportBuilder = mkReportBuilder_();
                    const test = stubTest_({browserId: 'bro'});

                    reportBuilder.addIdle(test);
                    reportBuilder.addSuccess(test);

                    const suiteResult = getSuiteResult_(reportBuilder);
                    assert.equal(suiteResult.status, SUCCESS);
                });

                it('first attempt was "error"', () => {
                    const reportBuilder = mkReportBuilder_();
                    const test = stubTest_({browserId: 'bro', hasDiff: () => false});

                    reportBuilder.addRetry(test);
                    reportBuilder.addSuccess(test);

                    const suiteResult = getSuiteResult_(reportBuilder);
                    assert.equal(suiteResult.status, SUCCESS);
                });

                it('first attempt was "fail"', () => {
                    const reportBuilder = mkReportBuilder_();
                    const test = stubTest_({browserId: 'bro', hasDiff: () => true});

                    reportBuilder.addRetry(test);
                    reportBuilder.addSuccess(test);

                    const suiteResult = getSuiteResult_(reportBuilder);
                    assert.equal(suiteResult.status, SUCCESS);
                });

                it('update test', () => {
                    const reportBuilder = mkReportBuilder_();
                    const test = stubTest_({browserId: 'bro', hasDiff: () => true});

                    reportBuilder.addRetry(test);
                    reportBuilder.addFail(test);
                    reportBuilder.addUpdated(test);

                    const suiteResult = getSuiteResult_(reportBuilder);
                    assert.equal(suiteResult.status, SUCCESS);
                });
            });
        });

        describe('for several browsers', () => {
            it('should not rewrite suite status to IDLE if some test still has such status', () => {
                const reportBuilder = mkReportBuilder_();

                reportBuilder.addFail(stubTest_({browserId: 'bro'}));
                reportBuilder.addIdle(stubTest_({browserId: 'another-bro'}));

                const suiteResult = getSuiteResult_(reportBuilder);
                assert.equal(suiteResult.status, FAIL);
            });

            it('should determine "error" if first test has "error"', () => {
                const reportBuilder = mkReportBuilder_();

                reportBuilder.addError(stubTest_({browserId: 'bro1'}));
                reportBuilder.addFail(stubTest_({browserId: 'bro2'}));
                reportBuilder.addUpdated(stubTest_({browserId: 'bro3'}));
                reportBuilder.addSuccess(stubTest_({browserId: 'bro4'}));
                reportBuilder.addSkipped(stubTest_({browserId: 'bro5'}));

                const suiteResult = getSuiteResult_(reportBuilder);
                assert.equal(suiteResult.status, ERROR);
            });

            it('should determine "error" if last test has "error"', () => {
                const reportBuilder = mkReportBuilder_();

                reportBuilder.addSkipped(stubTest_({browserId: 'bro5'}));
                reportBuilder.addSuccess(stubTest_({browserId: 'bro4'}));
                reportBuilder.addUpdated(stubTest_({browserId: 'bro3'}));
                reportBuilder.addFail(stubTest_({browserId: 'bro2'}));
                reportBuilder.addError(stubTest_({browserId: 'bro1'}));

                const suiteResult = getSuiteResult_(reportBuilder);
                assert.equal(suiteResult.status, ERROR);
            });

            it('should determine "fail" if first test has "fail"', () => {
                const reportBuilder = mkReportBuilder_();

                reportBuilder.addFail(stubTest_({browserId: 'bro1'}));
                reportBuilder.addUpdated(stubTest_({browserId: 'bro2'}));
                reportBuilder.addSuccess(stubTest_({browserId: 'bro3'}));
                reportBuilder.addSkipped(stubTest_({browserId: 'bro4'}));

                const suiteResult = getSuiteResult_(reportBuilder);
                assert.equal(suiteResult.status, FAIL);
            });

            it('should determine "fail" if last test has "fail"', () => {
                const reportBuilder = mkReportBuilder_();

                reportBuilder.addSkipped(stubTest_({browserId: 'bro4'}));
                reportBuilder.addSuccess(stubTest_({browserId: 'bro3'}));
                reportBuilder.addUpdated(stubTest_({browserId: 'bro2'}));
                reportBuilder.addFail(stubTest_({browserId: 'bro1'}));

                const suiteResult = getSuiteResult_(reportBuilder);
                assert.equal(suiteResult.status, FAIL);
            });

            it('should determine "success" if first test has "success"', () => {
                const reportBuilder = mkReportBuilder_();

                reportBuilder.addSuccess(stubTest_({browserId: 'bro1'}));
                reportBuilder.addSkipped(stubTest_({browserId: 'bro2'}));

                const suiteResult = getSuiteResult_(reportBuilder);
                assert.equal(suiteResult.status, SUCCESS);
            });

            it('should determine "success" if last test has "success"', () => {
                const reportBuilder = mkReportBuilder_();

                reportBuilder.addSkipped(stubTest_({browserId: 'bro2'}));
                reportBuilder.addSuccess(stubTest_({browserId: 'bro1'}));

                const suiteResult = getSuiteResult_(reportBuilder);
                assert.equal(suiteResult.status, SUCCESS);
            });

            it('should determine "success" if update failed test', () => {
                const reportBuilder = mkReportBuilder_();

                reportBuilder.addSkipped(stubTest_({browserId: 'bro1'}));
                reportBuilder.addError(stubTest_({browserId: 'bro2'}));
                reportBuilder.addUpdated(stubTest_({browserId: 'bro2'}));

                const suiteResult = getSuiteResult_(reportBuilder);
                assert.equal(suiteResult.status, SUCCESS);
            });
        });

        describe('for retried browsers', () => {
            [
                {status: 'failed', hasDiff: true},
                {status: 'errored', hasDiff: false}
            ].forEach(({status, hasDiff}) => {
                it(`should rewrite suite status to "success" if it has ${status}, then skipped test`, () => {
                    const reportBuilder = mkReportBuilder_();
                    const test1 = stubTest_({browserId: 'bro', hasDiff: () => hasDiff});
                    const test2 = stubTest_({browserId: 'bro', hasDiff: () => hasDiff});

                    reportBuilder.addSuccess(stubTest_({browserId: 'another-bro'}));
                    reportBuilder.addRetry(test1);
                    reportBuilder.addSkipped(test2);

                    const suiteResult = getSuiteResult_(reportBuilder);
                    assert.equal(suiteResult.status, SUCCESS);
                });
            });
        });

        describe('should rewrite suite status to "fail" if test failed with no reference image error', () => {
            it('and test does not exist in tests tree', () => {
                const reportBuilder = mkReportBuilder_();
                const test = stubTest_({
                    status: ERROR,
                    imagesInfo: [{
                        stateName: 'plain', status: ERROR,
                        error: {stack: `${NO_REF_IMAGE_ERROR}: ...`}
                    }]
                });

                reportBuilder.addError(test);

                const suiteResult = getSuiteResult_(reportBuilder);

                assert.equal(suiteResult.status, FAIL);
            });

            it('and test exists in tests tree', () => {
                const reportBuilder = mkReportBuilder_();
                const test = stubTest_({
                    status: ERROR,
                    imagesInfo: [{
                        stateName: 'plain', status: ERROR,
                        error: {stack: `${NO_REF_IMAGE_ERROR}: ...`}
                    }]
                });

                reportBuilder.addIdle(test);
                reportBuilder.addError(test);

                const suiteResult = getSuiteResult_(reportBuilder);

                assert.equal(suiteResult.status, FAIL);
            });
        });

        describe('should not rewrite suite status to "success" if image comparison is successful, but test', () => {
            [
                {status: FAIL, methodName: 'addFail'},
                {status: ERROR, methodName: 'addError'}
            ].forEach(({status, methodName}) => {
                it(`${status}ed`, () => {
                    const reportBuilder = mkReportBuilder_();

                    const test = stubTest_({
                        imagesInfo: [{stateName: 'plain', status: SUCCESS}]
                    });

                    reportBuilder.addIdle(test);
                    reportBuilder[methodName](test);

                    const suiteResult = getSuiteResult_(reportBuilder);

                    assert.equal(suiteResult.status, status);
                });
            });
        });
    });

    describe('addRetry', () => {
        it('should add "fail" status to result if test result has not equal images', () => {
            const reportBuilder = mkReportBuilder_();

            reportBuilder.addRetry(stubTest_({hasDiff: () => true}));

            assert.match(getReportBuilderResult_(reportBuilder), {status: FAIL});
        });

        it('should add "error" status to result if test result has no image', () => {
            const reportBuilder = mkReportBuilder_();

            reportBuilder.addRetry(stubTest_({hasDiff: () => false}));

            assert.match(getReportBuilderResult_(reportBuilder), {status: ERROR});
        });
    });

    describe('addIdle', () => {
        it('should add "idle" status to result', () => {
            const reportBuilder = mkReportBuilder_();

            reportBuilder.addIdle(stubTest_(), 'some/url');

            const result = getReportBuilderResult_(reportBuilder);
            assert.propertyVal(result, 'status', IDLE);
        });
    });

    describe('addUpdated', () => {
        it('should add "updated" status to result', () => {
            const reportBuilder = mkReportBuilder_();

            reportBuilder.addUpdated(stubTest_());

            const result = getReportBuilderResult_(reportBuilder);
            assert.propertyVal(result, 'status', UPDATED);
        });

        it('should update test image for current state name', () => {
            const reportBuilder = mkReportBuilder_();

            const failedTest = stubTest_({
                imagesInfo: [
                    {stateName: 'plain1', status: FAIL},
                    {stateName: 'plain2', status: FAIL}
                ]
            });
            const updatedTest = stubTest_({
                imagesInfo: [
                    {stateName: 'plain1', status: UPDATED}
                ]
            });

            reportBuilder.addFail(failedTest);
            reportBuilder.addUpdated(updatedTest);

            const {imagesInfo} = getReportBuilderResult_(reportBuilder);

            assert.match(imagesInfo[0], {stateName: 'plain1', status: UPDATED});
            assert.match(imagesInfo[1], {stateName: 'plain2', status: FAIL});
        });

        it('should not rewrite status to "updated" if test has failed states', () => {
            const reportBuilder = mkReportBuilder_();

            const failedTest = stubTest_({
                imagesInfo: [
                    {stateName: 'plain1', status: FAIL},
                    {stateName: 'plain2', status: FAIL}
                ]
            });
            const updatedTest = stubTest_({
                imagesInfo: [
                    {stateName: 'plain1', status: UPDATED}
                ]
            });

            reportBuilder.addFail(failedTest);
            reportBuilder.addUpdated(updatedTest);

            const {status} = getReportBuilderResult_(reportBuilder);

            assert.equal(status, FAIL);
        });

        it('should update last test image if state name was not passed', () => {
            const reportBuilder = mkReportBuilder_();

            const failedTest = stubTest_({
                imagesInfo: [
                    {stateName: 'plain1', status: FAIL},
                    {stateName: 'plain2', status: FAIL}
                ]
            });
            const updatedTest = stubTest_({
                imagesInfo: [
                    {status: UPDATED}
                ]
            });

            reportBuilder.addFail(failedTest);
            reportBuilder.addUpdated(updatedTest);

            const {imagesInfo} = getReportBuilderResult_(reportBuilder);

            assert.match(imagesInfo[0], {status: FAIL});
            assert.match(imagesInfo[1], {status: UPDATED});
        });
    });

    describe('saveDataFileAsync', () => {
        it('should create report directory asynchronously', () => {
            const reportBuilder = mkReportBuilder_({pluginConfig: {path: 'some/report/dir'}});

            return reportBuilder.saveDataFileAsync()
                .then(() => assert.calledOnceWith(fs.mkdirs, 'some/report/dir'));
        });

        it('should save data file with tests result asynchronously', () => {
            sandbox.stub(ReportBuilder.prototype, 'getResult').returns({test1: 'some-data'});
            serverUtils.prepareCommonJSData.returns('some data');

            const reportBuilder = mkReportBuilder_({pluginConfig: {path: 'some/report/dir'}});

            return reportBuilder.saveDataFileAsync()
                .then(() => assert.calledWith(fs.writeFile, path.join('some', 'report', 'dir', 'data.js'), 'some data', 'utf8'));
        });

        it('should create report directory before save data file', () => {
            const reportBuilder = mkReportBuilder_();

            return reportBuilder.saveDataFileAsync()
                .then(() => assert.callOrder(fs.mkdirs, fs.writeFile));
        });
    });

    describe('saveDataFileSync', () => {
        it('should create report directory synchronously', () => {
            const reportBuilder = mkReportBuilder_({pluginConfig: {path: 'some/report/dir'}});

            reportBuilder.saveDataFileSync();

            assert.calledOnceWith(fs.mkdirsSync, 'some/report/dir');
        });

        it('should save data file with tests result synchronously', () => {
            sandbox.stub(ReportBuilder.prototype, 'getResult').returns({test1: 'some-data'});
            serverUtils.prepareCommonJSData.returns('some data');

            const reportBuilder = mkReportBuilder_({pluginConfig: {path: 'some/report/dir'}});

            reportBuilder.saveDataFileSync();

            assert.calledOnceWith(fs.writeFileSync, path.join('some', 'report', 'dir', 'data.js'), 'some data', 'utf8');
        });

        it('should create report directory before save data file', () => {
            const reportBuilder = mkReportBuilder_();

            reportBuilder.saveDataFileSync();

            assert.callOrder(fs.mkdirsSync, fs.writeFileSync);
        });
    });

    describe('save', () => {
        beforeEach(() => {
            sandbox.stub(logger, 'warn');
        });

        it('should save data file', () => {
            const reportBuilder = mkReportBuilder_({pluginConfig: {path: 'some/report/dir'}});
            sandbox.stub(reportBuilder, 'saveDataFileAsync').resolves();

            return reportBuilder.save()
                .then(() => assert.calledOnce(reportBuilder.saveDataFileAsync));
        });

        it('should copy static files to report directory', () => {
            const reportBuilder = mkReportBuilder_({pluginConfig: {path: 'some/report/dir'}});

            return reportBuilder.save()
                .then(() => {
                    assert.calledWithMatch(fs.copy, 'index.html', path.join('some', 'report', 'dir', 'index.html'));
                    assert.calledWithMatch(fs.copy, 'report.min.js', path.join('some', 'report', 'dir', 'report.min.js'));
                    assert.calledWithMatch(fs.copy, 'report.min.css', path.join('some', 'report', 'dir', 'report.min.css'));
                });
        });

        it('should log an error', () => {
            const reportBuilder = mkReportBuilder_();
            sandbox.stub(reportBuilder, 'saveDataFileAsync').rejects(new Error('some-error'));

            return reportBuilder.save().then(() => assert.calledWith(logger.warn, 'some-error'));
        });
    });
});
