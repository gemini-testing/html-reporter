'use strict';

const fs = require('fs-extra');
const _ = require('lodash');
const serverUtils = require('lib/server-utils');
const TestAdapter = require('lib/test-adapter');
const proxyquire = require('proxyquire');
const {SUCCESS, FAIL, ERROR, SKIPPED, IDLE, UPDATED} = require('lib/constants/test-statuses');
const {getCommonErrors} = require('lib/constants/errors');
const {NO_REF_IMAGE_ERROR} = getCommonErrors();

describe('GuiReportBuilder', () => {
    const sandbox = sinon.sandbox.create();
    let hasImage, GuiReportBuilder;

    const mkGuiReportBuilder_ = async ({toolConfig, pluginConfig} = {}) => {
        toolConfig = _.defaults(toolConfig || {}, {getAbsoluteUrl: _.noop});
        pluginConfig = _.defaults(pluginConfig || {}, {baseHost: '', path: '', baseTestPath: ''});

        const browserConfigStub = {getAbsoluteUrl: toolConfig.getAbsoluteUrl};
        const hermione = {forBrowser: sandbox.stub().returns(browserConfigStub)};

        TestAdapter.create = (obj) => obj;

        const reportBuilder = GuiReportBuilder.create(hermione, pluginConfig);
        await reportBuilder.init();

        return reportBuilder;
    };

    const getReportBuilderResult_ = (reportBuilder) => reportBuilder.getSuites()[0].children[0].browsers[0].result;
    const getReportBuilderRetries_ = (reportBuilder) => reportBuilder.getSuites()[0].children[0].browsers[0].retries;

    const stubTest_ = (opts = {}) => {
        const {imagesInfo = []} = opts;

        let attempt = 0;
        if (opts.attempt === undefined) {
            Object.defineProperty(opts, 'attempt', {get: () => attempt++});
        }

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
            getImagesFor: () => ({}),
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
        GuiReportBuilder = proxyquire('lib/report-builder/gui', {
            '../server-utils': {
                hasImage
            }
        });
    });

    afterEach(() => sandbox.restore());

    it('should contain "file" in "metaInfo"', async () => {
        const reportBuilder = await mkGuiReportBuilder_();

        reportBuilder.addSuccess(stubTest_({
            suite: {file: '/path/file.js'}
        }));

        const metaInfo = getReportBuilderResult_(reportBuilder).metaInfo;

        assert.equal(metaInfo.file, '/path/file.js');
    });

    it('should contain "url" in "metaInfo"', async () => {
        const reportBuilder = await mkGuiReportBuilder_();

        reportBuilder.addSuccess(stubTest_({
            suite: {fullUrl: '/test/url'}
        }));

        const metaInfo = getReportBuilderResult_(reportBuilder).metaInfo;

        assert.equal(metaInfo.url, '/test/url');
    });

    it('should contain values from meta in meta info', async () => {
        const reportBuilder = await mkGuiReportBuilder_();

        reportBuilder.addSuccess(stubTest_({
            meta: {some: 'value'}
        }));

        const metaInfo = getReportBuilderResult_(reportBuilder).metaInfo;

        assert.match(metaInfo, {some: 'value'});
    });

    it('should do not duplicate sessionId from meta in meta info', async () => {
        const reportBuilder = await mkGuiReportBuilder_();

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

    it('should contain "name" for each suite', async () => {
        const reportBuilder = await mkGuiReportBuilder_();

        reportBuilder.addSuccess(stubTest_({
            state: {name: 'some-state'},
            suite: {path: ['root-suite']}
        }));

        const suiteResult = reportBuilder.getSuites()[0];
        const stateResult = suiteResult.children[0];

        assert.propertyVal(suiteResult, 'name', 'root-suite');
        assert.propertyVal(stateResult, 'name', 'some-state');
    });

    it('should set values added through api', async () => {
        const reportBuilder = await mkGuiReportBuilder_();

        reportBuilder.setApiValues({key: 'value'});

        assert.deepEqual(reportBuilder.getResult().apiValues, {key: 'value'});
    });

    it('should add skipped test to result', async () => {
        const reportBuilder = await mkGuiReportBuilder_();

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

    it('should add success test to result', async () => {
        const reportBuilder = await mkGuiReportBuilder_();

        reportBuilder.addSuccess(stubTest_({
            browserId: 'bro1'
        }));

        assert.match(getReportBuilderResult_(reportBuilder), {
            status: SUCCESS,
            name: 'bro1'
        });
    });

    it('should add failed test to result', async () => {
        const reportBuilder = await mkGuiReportBuilder_();

        reportBuilder.addFail(stubTest_({
            browserId: 'bro1',
            imageDir: 'some-image-dir'
        }));

        assert.match(getReportBuilderResult_(reportBuilder), {
            status: FAIL,
            name: 'bro1'
        });
    });

    it('should add error details to result if saveErrorDetails is set', async () => {
        const reportBuilder = await mkGuiReportBuilder_({pluginConfig: {saveErrorDetails: true}});

        reportBuilder.addFail(stubTest_({
            errorDetails: {title: 'some-title', filePath: 'some-path'}
        }));

        assert.match(getReportBuilderResult_(reportBuilder), {
            errorDetails: {
                title: 'some-title', filePath: 'some-path'
            }
        });
    });

    it('should not add error details to result if saveErrorDetails is not set', async () => {
        const reportBuilder = await mkGuiReportBuilder_({pluginConfig: {saveErrorDetails: false}});

        reportBuilder.addFail(stubTest_({
            errorDetails: {title: 'some-title', filePath: 'some-path'}
        }));

        assert.notDeepInclude(getReportBuilderResult_(reportBuilder), {
            errorDetails: {
                title: 'some-title', filePath: 'some-path'
            }
        });
    });

    it('should add error test to result', async () => {
        const reportBuilder = await mkGuiReportBuilder_();

        reportBuilder.addError(stubTest_({error: 'some-stack-trace'}));

        assert.match(getReportBuilderResult_(reportBuilder), {
            status: ERROR,
            error: 'some-stack-trace'
        });
    });

    it('should add base host to result with value from plugin parameter "baseHost"', async () => {
        const reportBuilder = await mkGuiReportBuilder_({pluginConfig: {baseHost: 'some-host'}});

        assert.equal(reportBuilder.getResult().config.baseHost, 'some-host');
    });

    it('should sort suites by name', async () => {
        const reportBuilder = await mkGuiReportBuilder_();
        reportBuilder.addSuccess(stubTest_({state: {name: 'some-state'}}));
        reportBuilder.addSuccess(stubTest_({state: {name: 'other-state'}}));

        const names = _.map(reportBuilder.getResult().suites[0].children, 'name');

        assert.sameOrderedMembers(names, ['other-state', 'some-state']);
    });

    it('should save retries order in the tree', async () => {
        const reportBuilder = await mkGuiReportBuilder_();

        reportBuilder.addRetry(stubTest_({attempt: 1, hasDiff: () => false}));
        reportBuilder.addFail(stubTest_({attempt: 2, hasDiff: () => false}));
        reportBuilder.addFail(stubTest_({attempt: 0, hasDiff: () => false}));
        const testResult = reportBuilder.getSuites()[0].children[0].browsers[0];

        assert.equal(testResult.result.attempt, 2);
        assert.equal(testResult.retries[0].attempt, 0);
        assert.equal(testResult.retries[1].attempt, 1);
    });

    describe('suite statuses', () => {
        const getSuiteResult_ = (reportBuilder) => reportBuilder.getSuites()[0].children[0];

        it('should set status for suite if suite status does not exist', async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            reportBuilder.addSuccess(stubTest_({browserId: 'bro'}));

            const suiteResult = getSuiteResult_(reportBuilder);
            assert.equal(suiteResult.status, SUCCESS);
        });

        describe('for one browser', () => {
            describe('should rewrite status to "skipped" if', () => {
                it('first attempt was "idle"', async () => {
                    const reportBuilder = await mkGuiReportBuilder_();
                    const test = stubTest_({browserId: 'bro'});

                    reportBuilder.addIdle(test);
                    reportBuilder.addSkipped(test);

                    const suiteResult = getSuiteResult_(reportBuilder);
                    assert.equal(suiteResult.status, SKIPPED);
                });

                it('first attempt was "error"', async () => {
                    const reportBuilder = await mkGuiReportBuilder_();
                    const test = stubTest_({browserId: 'bro', hasDiff: () => false});

                    reportBuilder.addRetry(test);
                    reportBuilder.addSkipped(test);

                    const suiteResult = getSuiteResult_(reportBuilder);
                    assert.equal(suiteResult.status, SKIPPED);
                });

                it('first attempt was "fail"', async () => {
                    const reportBuilder = await mkGuiReportBuilder_();
                    const test = stubTest_({browserId: 'bro', hasDiff: () => true});

                    reportBuilder.addRetry(test);
                    reportBuilder.addSkipped(test);

                    const suiteResult = getSuiteResult_(reportBuilder);
                    assert.equal(suiteResult.status, SKIPPED);
                });

                it('first attempt was "updated"', async () => {
                    const reportBuilder = await mkGuiReportBuilder_();
                    const test = stubTest_({browserId: 'bro', hasDiff: () => true});

                    reportBuilder.addUpdated(test);
                    reportBuilder.addSkipped(test);

                    const suiteResult = getSuiteResult_(reportBuilder);
                    assert.equal(suiteResult.status, SKIPPED);
                });

                it('first attempt was "success"', async () => {
                    const reportBuilder = await mkGuiReportBuilder_();
                    const test = stubTest_({browserId: 'bro', hasDiff: () => true});

                    reportBuilder.addSuccess(test);
                    reportBuilder.addSkipped(test);

                    const suiteResult = getSuiteResult_(reportBuilder);
                    assert.equal(suiteResult.status, SKIPPED);
                });
            });

            describe('should rewrite status to "success" if', async () => {
                it('first attempt was "idle"', async () => {
                    const reportBuilder = await mkGuiReportBuilder_();
                    const test = stubTest_({browserId: 'bro'});

                    reportBuilder.addIdle(test);
                    reportBuilder.addSuccess(test);

                    const suiteResult = getSuiteResult_(reportBuilder);
                    assert.equal(suiteResult.status, SUCCESS);
                });

                it('first attempt was "error"', async () => {
                    const reportBuilder = await mkGuiReportBuilder_();
                    const test = stubTest_({browserId: 'bro', hasDiff: () => false});

                    reportBuilder.addRetry(test);
                    reportBuilder.addSuccess(test);

                    const suiteResult = getSuiteResult_(reportBuilder);
                    assert.equal(suiteResult.status, SUCCESS);
                });

                it('first attempt was "fail"', async () => {
                    const reportBuilder = await mkGuiReportBuilder_();
                    const test = stubTest_({browserId: 'bro', hasDiff: () => true});

                    reportBuilder.addRetry(test);
                    reportBuilder.addSuccess(test);

                    const suiteResult = getSuiteResult_(reportBuilder);
                    assert.equal(suiteResult.status, SUCCESS);
                });

                it('update test', async () => {
                    const reportBuilder = await mkGuiReportBuilder_();
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
            it('should not rewrite suite status to IDLE if some test still has such status', async () => {
                const reportBuilder = await mkGuiReportBuilder_();

                reportBuilder.addFail(stubTest_({browserId: 'bro'}));
                reportBuilder.addIdle(stubTest_({browserId: 'another-bro'}));

                const suiteResult = getSuiteResult_(reportBuilder);
                assert.equal(suiteResult.status, FAIL);
            });

            it('should determine "error" if first test has "error"', async () => {
                const reportBuilder = await mkGuiReportBuilder_();

                reportBuilder.addError(stubTest_({browserId: 'bro1'}));
                reportBuilder.addFail(stubTest_({browserId: 'bro2'}));
                reportBuilder.addUpdated(stubTest_({browserId: 'bro3'}));
                reportBuilder.addSuccess(stubTest_({browserId: 'bro4'}));
                reportBuilder.addSkipped(stubTest_({browserId: 'bro5'}));

                const suiteResult = getSuiteResult_(reportBuilder);
                assert.equal(suiteResult.status, ERROR);
            });

            it('should determine "error" if last test has "error"', async () => {
                const reportBuilder = await mkGuiReportBuilder_();

                reportBuilder.addSkipped(stubTest_({browserId: 'bro5'}));
                reportBuilder.addSuccess(stubTest_({browserId: 'bro4'}));
                reportBuilder.addUpdated(stubTest_({browserId: 'bro3'}));
                reportBuilder.addFail(stubTest_({browserId: 'bro2'}));
                reportBuilder.addError(stubTest_({browserId: 'bro1'}));

                const suiteResult = getSuiteResult_(reportBuilder);
                assert.equal(suiteResult.status, ERROR);
            });

            it('should determine "fail" if first test has "fail"', async () => {
                const reportBuilder = await mkGuiReportBuilder_();

                reportBuilder.addFail(stubTest_({browserId: 'bro1'}));
                reportBuilder.addUpdated(stubTest_({browserId: 'bro2'}));
                reportBuilder.addSuccess(stubTest_({browserId: 'bro3'}));
                reportBuilder.addSkipped(stubTest_({browserId: 'bro4'}));

                const suiteResult = getSuiteResult_(reportBuilder);
                assert.equal(suiteResult.status, FAIL);
            });

            it('should determine "fail" if last test has "fail"', async () => {
                const reportBuilder = await mkGuiReportBuilder_();

                reportBuilder.addSkipped(stubTest_({browserId: 'bro4'}));
                reportBuilder.addSuccess(stubTest_({browserId: 'bro3'}));
                reportBuilder.addUpdated(stubTest_({browserId: 'bro2'}));
                reportBuilder.addFail(stubTest_({browserId: 'bro1'}));

                const suiteResult = getSuiteResult_(reportBuilder);
                assert.equal(suiteResult.status, FAIL);
            });

            it('should determine "success" if first test has "success"', async () => {
                const reportBuilder = await mkGuiReportBuilder_();

                reportBuilder.addSuccess(stubTest_({browserId: 'bro1'}));
                reportBuilder.addSkipped(stubTest_({browserId: 'bro2'}));

                const suiteResult = getSuiteResult_(reportBuilder);
                assert.equal(suiteResult.status, SUCCESS);
            });

            it('should determine "success" if last test has "success"', async () => {
                const reportBuilder = await mkGuiReportBuilder_();

                reportBuilder.addSkipped(stubTest_({browserId: 'bro2'}));
                reportBuilder.addSuccess(stubTest_({browserId: 'bro1'}));

                const suiteResult = getSuiteResult_(reportBuilder);
                assert.equal(suiteResult.status, SUCCESS);
            });

            it('should determine "success" if update failed test', async () => {
                const reportBuilder = await mkGuiReportBuilder_();

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
                it(`should rewrite suite status to "success" if it has ${status}, then skipped test`, async () => {
                    const reportBuilder = await mkGuiReportBuilder_();
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
            it('and test does not exist in tests tree', async () => {
                const reportBuilder = await mkGuiReportBuilder_();
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

            it('and test exists in tests tree', async () => {
                const reportBuilder = await mkGuiReportBuilder_();
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
                it(`${status}ed`, async () => {
                    const reportBuilder = await mkGuiReportBuilder_();

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
        it('should add "fail" status to result if test result has not equal images', async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            reportBuilder.addRetry(stubTest_({hasDiff: () => true}));

            assert.match(getReportBuilderResult_(reportBuilder), {status: FAIL});
        });

        it('should add "error" status to result if test result has no image', async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            reportBuilder.addRetry(stubTest_({hasDiff: () => false}));

            assert.match(getReportBuilderResult_(reportBuilder), {status: ERROR});
        });
    });

    describe('addIdle', () => {
        it('should add "idle" status to result', async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            reportBuilder.addIdle(stubTest_(), 'some/url');

            const result = getReportBuilderResult_(reportBuilder);
            assert.propertyVal(result, 'status', IDLE);
        });
    });

    describe('addUpdated', () => {
        it('should add "updated" status to result', async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            reportBuilder.addUpdated(stubTest_());

            const result = getReportBuilderResult_(reportBuilder);
            assert.propertyVal(result, 'status', UPDATED);
        });

        it('should update test image for current state name', async () => {
            const reportBuilder = await mkGuiReportBuilder_();

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

        it('should not rewrite status to "updated" if test has failed states', async () => {
            const reportBuilder = await mkGuiReportBuilder_();

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

        it('should update last test image if state name was not passed', async () => {
            const reportBuilder = await mkGuiReportBuilder_();

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
});
