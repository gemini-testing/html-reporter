'use strict';

const fs = require('fs-extra');
const _ = require('lodash');
const serverUtils = require('lib/server-utils');
const TestAdapter = require('lib/test-adapter');
const GuiTestsTreeBuilder = require('lib/tests-tree-builder/gui');
const proxyquire = require('proxyquire');
const {SUCCESS, FAIL, ERROR, SKIPPED, IDLE, UPDATED} = require('lib/constants/test-statuses');
const {mkFormattedTest} = require('../../utils');

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

    const getTestResult_ = () => GuiTestsTreeBuilder.prototype.addTestResult.firstCall.args[0];
    const getFormattedResult_ = () => GuiTestsTreeBuilder.prototype.addTestResult.firstCall.args[1];

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
            '../server-utils': {hasImage}
        });

        sandbox.stub(GuiTestsTreeBuilder, 'create').returns(Object.create(GuiTestsTreeBuilder.prototype));
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'sortTree').returns({});
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'reuseTestsTree');
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'getImagesInfo').returns([]);
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'convertToOldFormat').returns({});
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'getLastResult').returns({});
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'addTestResult').returns({});
    });

    afterEach(() => sandbox.restore());

    describe('"addIdle" method', () => {
        it(`should add "${IDLE}" status to result`, async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            reportBuilder.addIdle(stubTest_());

            assert.equal(getTestResult_().status, IDLE);
        });
    });

    describe('"addSkipped" method', () => {
        it('should add skipped test to results', async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            reportBuilder.addSkipped(stubTest_({
                browserId: 'bro1',
                suite: {
                    skipComment: 'some skip comment',
                    fullName: 'suite-full-name'
                }
            }));

            assert.equal(getTestResult_().status, SKIPPED);
            assert.deepEqual(reportBuilder.getResult().skips, [{
                suite: 'suite-full-name',
                browser: 'bro1',
                comment: 'some skip comment'
            }]);
        });
    });

    describe('"addSuccess" method', () => {
        it('should add success test to result', async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            reportBuilder.addSuccess(stubTest_({
                browserId: 'bro1'
            }));

            assert.match(getTestResult_(), {
                status: SUCCESS,
                name: 'bro1'
            });
        });
    });

    describe('"addFail" method', () => {
        it('should add failed test to result', async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            reportBuilder.addFail(stubTest_({
                browserId: 'bro1',
                imageDir: 'some-image-dir'
            }));

            assert.match(getTestResult_(), {
                status: FAIL,
                name: 'bro1'
            });
        });
    });

    describe('"addError" method', () => {
        it('should add error test to result', async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            reportBuilder.addError(stubTest_({error: 'some-stack-trace'}));

            assert.match(getTestResult_(), {
                status: ERROR,
                error: 'some-stack-trace'
            });
        });
    });

    describe('"addRetry" method', () => {
        it('should add "fail" status to result if test result has not equal images', async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            reportBuilder.addRetry(stubTest_({hasDiff: () => true}));

            assert.equal(getTestResult_().status, FAIL);
        });

        it('should add "error" status to result if test result has no image', async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            reportBuilder.addRetry(stubTest_({hasDiff: () => false}));

            assert.equal(getTestResult_().status, ERROR);
        });
    });

    describe('"addUpdated" method', () => {
        it(`should add "${SUCCESS}" status to result if all images updated`, async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            reportBuilder.addUpdated(stubTest_({imagesInfo: [{status: UPDATED}]}));

            assert.equal(getTestResult_().status, SUCCESS);
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
            GuiTestsTreeBuilder.prototype.getImagesInfo.returns(failedTest.imagesInfo);
            reportBuilder.addUpdated(updatedTest);

            const {imagesInfo} = getTestResult_();

            assert.match(imagesInfo[0], {stateName: 'plain1', status: UPDATED});
            assert.match(imagesInfo[1], {stateName: 'plain2', status: FAIL});
            assert.equal(getTestResult_().status, FAIL);
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
            GuiTestsTreeBuilder.prototype.getImagesInfo.returns(failedTest.imagesInfo);
            reportBuilder.addUpdated(updatedTest);

            const {imagesInfo} = getTestResult_();

            assert.match(imagesInfo[0], {status: FAIL});
            assert.match(imagesInfo[1], {status: UPDATED});
        });
    });

    describe('"setApiValues" method', () => {
        it('should set values added through api', async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            reportBuilder.setApiValues({key: 'value'});

            assert.deepEqual(reportBuilder.getResult().apiValues, {key: 'value'});
        });
    });

    describe('"reuseTestsTree" method', () => {
        it('should call "reuseTestsTree" from tests tree builder', async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            reportBuilder.reuseTestsTree('some-tree');

            assert.calledOnceWith(GuiTestsTreeBuilder.prototype.reuseTestsTree, 'some-tree');
        });
    });

    describe('"getResult" method', () => {
        it('should sort tests tree', async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            reportBuilder.getResult();

            assert.calledOnceWith(GuiTestsTreeBuilder.prototype.sortTree);
        });

        it('should add base host to result with value from plugin parameter "baseHost"', async () => {
            const reportBuilder = await mkGuiReportBuilder_({pluginConfig: {baseHost: 'some-host'}});

            assert.equal(reportBuilder.getResult().config.baseHost, 'some-host');
        });
    });

    describe('"getSuites" method', () => {
        it('should return suites from tests tree builder', async () => {
            const suites = {some: 'suite'};
            GuiTestsTreeBuilder.prototype.convertToOldFormat.returns({suites});

            const reportBuilder = await mkGuiReportBuilder_();

            assert.deepEqual(reportBuilder.getSuites(), suites);
        });
    });

    describe('"getCurrAttempt" method', () => {
        [IDLE, SKIPPED].forEach((status) => {
            it(`should return attempt for last result if status is "${status}"`, async () => {
                const formattedResult = {status, attempt: 100500};
                GuiTestsTreeBuilder.prototype.getLastResult.returns(formattedResult);
                const reportBuilder = await mkGuiReportBuilder_();

                const currAttempt = reportBuilder.getCurrAttempt(formattedResult);

                assert.equal(currAttempt, formattedResult.attempt);
            });
        });

        [SUCCESS, FAIL, ERROR, UPDATED].forEach((status) => {
            it(`should return attempt for next result if status is "${status}"`, async () => {
                const formattedResult = {status, attempt: 100500};
                GuiTestsTreeBuilder.prototype.getLastResult.returns(formattedResult);
                const reportBuilder = await mkGuiReportBuilder_();

                const currAttempt = reportBuilder.getCurrAttempt(formattedResult);

                assert.equal(currAttempt, formattedResult.attempt + 1);
            });
        });
    });

    describe('add test result to tree', () => {
        describe('should pass test result with', () => {
            it('"suiteUrl" field', async () => {
                const reportBuilder = await mkGuiReportBuilder_();

                reportBuilder.addSuccess(stubTest_({
                    suite: {
                        url: 'some-url'
                    }
                }));

                assert.equal(getTestResult_().suiteUrl, 'some-url');
            });

            it('"name" field as browser id', async () => {
                const reportBuilder = await mkGuiReportBuilder_();

                reportBuilder.addSuccess(stubTest_({browserId: 'yabro'}));

                assert.equal(getTestResult_().name, 'yabro');
            });

            it('"metaInfo" field', async () => {
                const reportBuilder = await mkGuiReportBuilder_();

                reportBuilder.addSuccess(stubTest_({
                    meta: {some: 'value', sessionId: '12345'},
                    suite: {
                        file: '/path/file.js',
                        fullUrl: '/test/url'
                    }
                }));

                const expectedMetaInfo = {some: 'value', sessionId: '12345', file: '/path/file.js', url: '/test/url'};

                assert.deepEqual(getTestResult_().metaInfo, expectedMetaInfo);
            });

            [
                {name: 'description', value: 'some-descr'},
                {name: 'imagesInfo', value: ['some-images']},
                {name: 'screenshot', value: false},
                {name: 'multipleTabs', value: true}
            ].forEach(({name, value}) => {
                it(`add "${name}" field`, async () => {
                    const reportBuilder = await mkGuiReportBuilder_();

                    reportBuilder.addSuccess(stubTest_({[name]: value}));

                    assert.deepEqual(getTestResult_()[name], value);
                });
            });
        });

        it('should pass test result without "errorDetails" if "saveErrorDetails" is not set', async () => {
            const reportBuilder = await mkGuiReportBuilder_({pluginConfig: {saveErrorDetails: false}});
            const errorDetails = {title: 'some-title', filePath: 'some-path'};

            reportBuilder.addFail(stubTest_({errorDetails}));

            assert.isUndefined(getTestResult_().errorDetails);
        });

        it('should pass test result with "errorDetails" if "saveErrorDetails" is set', async () => {
            const reportBuilder = await mkGuiReportBuilder_({pluginConfig: {saveErrorDetails: true}});
            const errorDetails = {title: 'some-title', filePath: 'some-path'};

            reportBuilder.addFail(stubTest_({errorDetails}));

            assert.deepEqual(getTestResult_().errorDetails, errorDetails);
        });

        it('should pass formatted result', async () => {
            const reportBuilder = await mkGuiReportBuilder_();
            const formattedTest = mkFormattedTest();
            sandbox.stub(reportBuilder, 'format').returns(formattedTest);

            reportBuilder.addSuccess(stubTest_());

            assert.deepEqual(getFormattedResult_(), formattedTest);
        });
    });
});
