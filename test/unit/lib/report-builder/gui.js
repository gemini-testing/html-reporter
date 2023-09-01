'use strict';

const fs = require('fs-extra');
const _ = require('lodash');
const proxyquire = require('proxyquire');
const serverUtils = require('lib/server-utils');
const {TestAdapter} = require('lib/test-adapter');
const {SqliteAdapter} = require('lib/sqlite-adapter');
const GuiTestsTreeBuilder = require('lib/tests-tree-builder/gui');
const {HtmlReporter} = require('lib/plugin-api');
const {SUCCESS, FAIL, ERROR, SKIPPED, IDLE, RUNNING, UPDATED} = require('lib/constants/test-statuses');
const {LOCAL_DATABASE_NAME} = require('lib/constants/database');
const {mkFormattedTest} = require('../../utils');

const TEST_REPORT_PATH = 'test';
const TEST_DB_PATH = `${TEST_REPORT_PATH}/${LOCAL_DATABASE_NAME}`;

describe('GuiReportBuilder', () => {
    const sandbox = sinon.sandbox.create();
    let hasImage, deleteFile, GuiReportBuilder;

    const mkGuiReportBuilder_ = async ({toolConfig, pluginConfig} = {}) => {
        toolConfig = _.defaults(toolConfig || {}, {getAbsoluteUrl: _.noop});
        pluginConfig = _.defaults(pluginConfig || {}, {baseHost: '', path: TEST_REPORT_PATH, baseTestPath: ''});

        const browserConfigStub = {getAbsoluteUrl: toolConfig.getAbsoluteUrl};
        const hermione = {
            forBrowser: sandbox.stub().returns(browserConfigStub),
            htmlReporter: HtmlReporter.create()
        };

        TestAdapter.create = (obj) => obj;

        const reportBuilder = GuiReportBuilder.create(hermione.htmlReporter, pluginConfig);
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
            origAttempt: 0,
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
        deleteFile = sandbox.stub().resolves();
        GuiReportBuilder = proxyquire('lib/report-builder/gui', {
            '../server-utils': {hasImage, deleteFile}
        });

        sandbox.stub(GuiTestsTreeBuilder, 'create').returns(Object.create(GuiTestsTreeBuilder.prototype));
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'sortTree').returns({});
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'reuseTestsTree');
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'getTestBranch').returns({});
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'getTestsDataToUpdateRefs').returns([]);
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'getImageDataToFindEqualDiffs').returns({});
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'getImagesInfo').returns([]);
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'getLastResult').returns({});
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'getResultByOrigAttempt').returns({});
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'addTestResult').returns({});
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'getResultDataToUnacceptImage').returns({});
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'updateImageInfo').returns({});
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'removeTestResult');
    });

    afterEach(() => {
        fs.removeSync(TEST_DB_PATH);
        sandbox.restore();
    });

    describe('"addIdle" method', () => {
        it(`should add "${IDLE}" status to result`, async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            reportBuilder.addIdle(stubTest_());

            assert.equal(getTestResult_().status, IDLE);
        });
    });

    describe('"addRunning" method', () => {
        it(`should add "${RUNNING}" status to result`, async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            reportBuilder.addRunning(stubTest_());

            assert.equal(getTestResult_().status, RUNNING);
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

        it(`should corectly determine the status based on a previous result`, async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            GuiTestsTreeBuilder.prototype.getResultByOrigAttempt.returns({status: FAIL});

            reportBuilder.addUpdated(stubTest_({
                imagesInfo: [{status: FAIL}],
                attempt: 4,
                origAttempt: 2
            }));

            assert.equal(getTestResult_().status, FAIL);
            assert.calledOnceWith(GuiTestsTreeBuilder.prototype.getResultByOrigAttempt, sinon.match({
                origAttempt: 2
            }));
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

            const updatedTestResult = GuiTestsTreeBuilder.prototype.addTestResult.secondCall.args[0];

            assert.match(updatedTestResult.imagesInfo[0], {stateName: 'plain1', status: UPDATED});
            assert.match(updatedTestResult.imagesInfo[1], {stateName: 'plain2', status: FAIL});
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
                id: 'result-2',
                imagesInfo: [
                    {status: UPDATED}
                ]
            });

            reportBuilder.addFail(failedTest);
            GuiTestsTreeBuilder.prototype.getImagesInfo.returns(failedTest.imagesInfo);
            reportBuilder.addUpdated(updatedTest);

            const {imagesInfo} = GuiTestsTreeBuilder.prototype.addTestResult.secondCall.args[0];

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

    [
        {
            method: 'reuseTestsTree',
            arg: 'some-tree'
        },
        {
            method: 'getTestBranch',
            arg: 'test-id'
        },
        {
            method: 'getTestsDataToUpdateRefs',
            arg: ['img-id-1', 'img-id-2']
        },
        {
            method: 'getImageDataToFindEqualDiffs',
            arg: 'img-id'
        }
    ].forEach(({method, arg}) => {
        describe(`"${method}" method`, () => {
            it(`should call "${method}" from tests tree builder`, async () => {
                const reportBuilder = await mkGuiReportBuilder_();

                reportBuilder[method](arg);

                assert.calledOnceWith(GuiTestsTreeBuilder.prototype[method], arg);
            });
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

    describe('"undoAcceptImages"', () => {
        let reportBuilder;

        function stubResultData_(result, {resultId, stateName}) {
            const res = _.defaultsDeep(result, {
                imageId: 'imageId',
                status: UPDATED,
                timestamp: 100500,
                shouldRemoveResult: false,
                previousImage: {
                    expectedImg: {path: 'previous-expected-path'},
                    refImg: {path: 'previous-reference-path', size: null}
                }
            });

            GuiTestsTreeBuilder.prototype.getResultDataToUnacceptImage.withArgs(resultId, stateName).returns(res);
        }

        function mkFormattedResultStub_(opts = {}) {
            return {
                id: opts.id || 'id',
                testPath: opts.testPath || ['test', 'path'],
                browserId: opts.browserId || 'browser-id',
                decreaseAttemptNumber: opts.decreaseAttemptNumber || sandbox.stub()
            };
        }

        beforeEach(async () => {
            reportBuilder = await mkGuiReportBuilder_();

            sandbox.stub(SqliteAdapter.prototype, 'delete');
        });

        describe('if image status is not "updated"', () => {
            const tryUndoFailedImage_ = async () => {
                const stateName = 'plain';
                stubResultData_({status: FAIL}, {resultId: 'id', stateName});

                const formattedResult = mkFormattedResultStub_({id: 'id', stateName});

                await reportBuilder.undoAcceptImage(formattedResult, stateName);
            };

            it('should not remove image from report', async () => {
                await tryUndoFailedImage_();

                assert.notCalled(deleteFile);
            });

            it('should not update image info', async () => {
                await tryUndoFailedImage_();

                assert.notCalled(GuiTestsTreeBuilder.prototype.updateImageInfo);
            });

            it('should not delete test from db', async () => {
                await tryUndoFailedImage_();

                assert.notCalled(SqliteAdapter.prototype.delete);
            });
        });

        it('should remove result from tree, if "resultIdToRemove" is provided', async () => {
            const resultId = 'result-id';
            const stateName = 's-name';
            const formattedResult = mkFormattedResultStub_({id: resultId, stateName});
            stubResultData_({shouldRemoveResult: true}, {resultId, stateName});

            await reportBuilder.undoAcceptImage(formattedResult, stateName);

            assert.calledOnceWith(GuiTestsTreeBuilder.prototype.removeTestResult, 'result-id');
        });

        it('should decrease test attempt number after deleting result', async () => {
            const resultId = 'id';
            const stateName = 's-name';
            const formattedResult = mkFormattedResultStub_({id: resultId, stateName});
            stubResultData_({shouldRemoveResult: true}, {resultId, stateName});

            await reportBuilder.undoAcceptImage(formattedResult, stateName);

            assert.calledOnceWith(formattedResult.decreaseAttemptNumber);
        });

        it('should resolve removed result id', async () => {
            const resultId = 'result-id';
            const stateName = 's-name';
            const formattedResult = mkFormattedResultStub_({id: resultId, stateName});
            stubResultData_({shouldRemoveResult: true}, {resultId, stateName});

            const {removedResult} = await reportBuilder.undoAcceptImage(formattedResult, stateName);

            assert.deepEqual(removedResult, 'result-id');
        });

        it('should update image info if "shouldRemoveResult" is false', async () => {
            const resultId = 'result-id';
            const stateName = 's-name';
            const formattedResult = mkFormattedResultStub_({id: resultId, stateName});
            const previousImage = {
                expectedImg: {path: 'previous-expected-path'},
                refImg: {path: 'previous-reference-path', size: null}
            };
            stubResultData_({previousImage, imageId: 'imgId', shouldRemoveResult: false}, {resultId, stateName});

            await reportBuilder.undoAcceptImage(formattedResult, stateName);

            assert.calledOnceWith(GuiTestsTreeBuilder.prototype.updateImageInfo, 'imgId', previousImage);
        });

        it('should resolve updated image info if "resultIdToRemove" is not provided', async () => {
            const resultId = 'result-id';
            const stateName = 's-name';
            const formattedResult = mkFormattedResultStub_({id: resultId, stateName});
            const previousImage = {
                expectedImg: {path: 'previous-expected-path'},
                refImg: {path: 'previous-reference-path', size: null}
            };
            const updatedImage = {
                id: 'updated-img-id',
                parentId: 'parent-id'
            };
            stubResultData_({imageId: 'imgId', previousImage}, {resultId, stateName});
            GuiTestsTreeBuilder.prototype.updateImageInfo.withArgs('imgId', previousImage).returns(updatedImage);

            const {updatedImage: updatedImageResult} = await reportBuilder.undoAcceptImage(formattedResult, stateName);

            assert.deepEqual(updatedImageResult, updatedImage);
        });

        it('should delete test result from db', async () => {
            const resultId = 'result-id';
            const stateName = 'plain';
            const formattedResult = mkFormattedResultStub_({
                id: resultId,
                stateName,
                testPath: ['s', 'p'],
                browserId: 'bro-name'
            });
            stubResultData_({status: UPDATED, timestamp: 100500}, {resultId, stateName});

            await reportBuilder.undoAcceptImage(formattedResult, stateName);

            assert.calledOnceWith(
                SqliteAdapter.prototype.delete,
                sinon.match.any,
                '["s","p"]',
                'bro-name',
                UPDATED,
                100500,
                'plain'
            );
        });

        it('should resolve reference to remove, if previous image did not have a reference', async () => {
            const resultId = 'result-id';
            const stateName = 'plain';
            const formattedResult = mkFormattedResultStub_({id: resultId, stateName});
            stubResultData_(_.set({}, 'previousImage.refImg', {path: 'ref-path', size: null}), {resultId, stateName});

            const {shouldRemoveReference} = await reportBuilder.undoAcceptImage(formattedResult, stateName);

            assert.isTrue(shouldRemoveReference);
        });

        it('should not resolve reference to remove, if previous image had a reference', async () => {
            const resultId = 'result-id';
            const stateName = 'plain';
            const formattedResult = mkFormattedResultStub_({id: resultId, stateName});
            stubResultData_(_.set({}, 'previousImage.refImg.size', {width: 100500, height: 500100}), {resultId, stateName});

            const {shouldRemoveReference} = await reportBuilder.undoAcceptImage(formattedResult, stateName);

            assert.isFalse(shouldRemoveReference);
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
