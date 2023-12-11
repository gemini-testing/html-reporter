'use strict';

const fs = require('fs-extra');
const _ = require('lodash');
const proxyquire = require('proxyquire');
const serverUtils = require('lib/server-utils');
const {HermioneTestAdapter} = require('lib/test-adapter');
const {SqliteClient} = require('lib/sqlite-client');
const {GuiTestsTreeBuilder} = require('lib/tests-tree-builder/gui');
const {HtmlReporter} = require('lib/plugin-api');
const {SUCCESS, FAIL, ERROR, SKIPPED, IDLE, RUNNING, UPDATED} = require('lib/constants/test-statuses');
const {LOCAL_DATABASE_NAME} = require('lib/constants/database');
const {TestAttemptManager} = require('lib/test-attempt-manager');
const {ImageDiffError} = require('../../utils');
const {ImageHandler} = require('lib/image-handler');

const TEST_REPORT_PATH = 'test';
const TEST_DB_PATH = `${TEST_REPORT_PATH}/${LOCAL_DATABASE_NAME}`;

describe('GuiReportBuilder', () => {
    const sandbox = sinon.sandbox.create();
    let hasImage, deleteFile, GuiReportBuilder, dbClient, testAttemptManager, copyAndUpdate;

    const mkGuiReportBuilder_ = async ({toolConfig, pluginConfig} = {}) => {
        toolConfig = _.defaults(toolConfig || {}, {getAbsoluteUrl: _.noop});
        pluginConfig = _.defaults(pluginConfig || {}, {baseHost: '', path: TEST_REPORT_PATH, baseTestPath: ''});

        const htmlReporter = HtmlReporter.create({baseHost: ''});

        const browserConfigStub = {getAbsoluteUrl: toolConfig.getAbsoluteUrl};
        const hermione = {
            forBrowser: sandbox.stub().returns(browserConfigStub),
            htmlReporter
        };

        HermioneTestAdapter.create = (obj) => obj;

        dbClient = await SqliteClient.create({htmlReporter, reportPath: TEST_REPORT_PATH});
        testAttemptManager = new TestAttemptManager();

        const reportBuilder = GuiReportBuilder.create(hermione.htmlReporter, pluginConfig, {dbClient, testAttemptManager});

        const workers = {saveDiffTo: () => {}};
        reportBuilder.registerWorkers(workers);

        return reportBuilder;
    };

    const getTestResult_ = () => GuiTestsTreeBuilder.prototype.addTestResult.firstCall.args[0];

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

        copyAndUpdate = sandbox.stub().callsFake(_.identity);

        const imageHandler = sandbox.createStubInstance(ImageHandler);

        hasImage = sandbox.stub().returns(true);
        deleteFile = sandbox.stub().resolves();
        GuiReportBuilder = proxyquire('lib/report-builder/gui', {
            './static': {
                StaticReportBuilder: proxyquire('lib/report-builder/static', {
                    '../sqlite-client': {SqliteClient},
                    '../image-handler': {ImageHandler: function() {
                        return imageHandler;
                    }}
                }).StaticReportBuilder
            },
            '../server-utils': {hasImage, deleteFile},
            '../test-adapter/utils': {copyAndUpdate}
        }).GuiReportBuilder;

        sandbox.stub(GuiTestsTreeBuilder, 'create').returns(Object.create(GuiTestsTreeBuilder.prototype));
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'sortTree').returns({});
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'reuseTestsTree');
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'getTestBranch').returns({});
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'getTestsDataToUpdateRefs').returns([]);
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'getImageDataToFindEqualDiffs').returns({});
        sandbox.stub(GuiTestsTreeBuilder.prototype, 'getImagesInfo').returns([]);
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

            await reportBuilder.addIdle(stubTest_());

            assert.equal(getTestResult_().status, IDLE);
        });
    });

    describe('"addRunning" method', () => {
        it(`should add "${RUNNING}" status to result`, async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            await reportBuilder.addRunning(stubTest_());

            assert.equal(getTestResult_().status, RUNNING);
        });
    });

    describe('"addSkipped" method', () => {
        it('should add skipped test to results', async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            await reportBuilder.addSkipped(stubTest_({
                browserId: 'bro1',
                skipReason: 'some skip comment',
                fullName: 'suite-full-name'
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

            await reportBuilder.addSuccess(stubTest_({
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

            await reportBuilder.addFail(stubTest_({
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

            await reportBuilder.addError(stubTest_({error: {message: 'some-error-message'}}));

            assert.match(getTestResult_(), {
                status: ERROR,
                error: {message: 'some-error-message'}
            });
        });
    });

    describe('"addRetry" method', () => {
        it('should add "fail" status to result if test result has not equal images', async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            await reportBuilder.addRetry(stubTest_({assertViewResults: [new ImageDiffError()]}));

            assert.equal(getTestResult_().status, FAIL);
        });

        it('should add "error" status to result if test result has no image', async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            await reportBuilder.addRetry(stubTest_({assertViewResults: [{name: 'some-error-name'}]}));

            assert.equal(getTestResult_().status, ERROR);
        });
    });

    describe('"addUpdated" method', () => {
        it(`should add "${UPDATED}" status to result if all images updated`, async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            await reportBuilder.addUpdated(stubTest_({testPath: [], imagesInfo: [{status: UPDATED}]}));

            assert.equal(getTestResult_().status, UPDATED);
        });

        it(`should add "${UPDATED}" status even if result has errors`, async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            await reportBuilder.addUpdated(stubTest_({
                testPath: [],
                error: {name: 'some-error', message: 'some-message'},
                imagesInfo: [{status: FAIL}],
                attempt: 4
            }));

            assert.equal(getTestResult_().status, UPDATED);
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
                    {stateName: 'plain1', status: UPDATED},
                    {stateName: 'plain2', status: FAIL}
                ],
                testPath: []
            });

            await reportBuilder.addFail(failedTest);
            GuiTestsTreeBuilder.prototype.getImagesInfo.returns(failedTest.imagesInfo);
            await reportBuilder.addUpdated(updatedTest);

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
                ],
                testPath: []
            });

            await reportBuilder.addFail(failedTest);
            GuiTestsTreeBuilder.prototype.getImagesInfo.returns(failedTest.imagesInfo);
            await reportBuilder.addUpdated(updatedTest, 'result-2');

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
            arg: {results: {byId: {}}}
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

    describe('"undoAcceptImages"', () => {
        let reportBuilder;

        function stubResultData_(result, {resultId, stateName}) {
            const res = _.defaults(result, {
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

            sandbox.stub(SqliteClient.prototype, 'delete');
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

                assert.notCalled(SqliteClient.prototype.delete);
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

        it('should resolve removed result', async () => {
            const resultId = 'result-id';
            const stateName = 's-name';
            const formattedResult = mkFormattedResultStub_({id: resultId, stateName});
            stubResultData_({shouldRemoveResult: true}, {resultId, stateName});

            const {removedResult} = await reportBuilder.undoAcceptImage(formattedResult, stateName);

            assert.deepEqual(removedResult, formattedResult);
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
            const previousImage = null;
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
                SqliteClient.prototype.delete,
                sinon.match.any,
                '["s","p"]',
                'bro-name',
                UPDATED,
                '100500',
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

                await reportBuilder.addSuccess(stubTest_({
                    url: 'some-url'
                }));

                assert.equal(getTestResult_().suiteUrl, 'some-url');
            });

            it('"name" field as browser id', async () => {
                const reportBuilder = await mkGuiReportBuilder_();

                await reportBuilder.addSuccess(stubTest_({browserId: 'yabro'}));

                assert.equal(getTestResult_().name, 'yabro');
            });

            it('"metaInfo" field', async () => {
                const reportBuilder = await mkGuiReportBuilder_();

                await reportBuilder.addSuccess(stubTest_({
                    meta: {some: 'value', sessionId: '12345'},
                    file: '/path/file.js',
                    url: '/test/url'
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

                    await reportBuilder.addSuccess(stubTest_({[name]: value}));

                    assert.deepEqual(getTestResult_()[name], value);
                });
            });
        });

        it('should pass test result without "errorDetails" if "saveErrorDetails" is not set', async () => {
            const reportBuilder = await mkGuiReportBuilder_({pluginConfig: {saveErrorDetails: false}});
            const errorDetails = {title: 'some-title', filePath: 'some-path'};

            await reportBuilder.addFail(stubTest_({errorDetails}));

            assert.isUndefined(getTestResult_().errorDetails);
        });

        it('should pass test result with "errorDetails" if "saveErrorDetails" is set', async () => {
            const reportBuilder = await mkGuiReportBuilder_({pluginConfig: {saveErrorDetails: true}});
            const errorDetails = {title: 'some-title', filePath: 'some-path'};

            await reportBuilder.addFail(stubTest_({errorDetails}));

            assert.deepEqual(getTestResult_().errorDetails, errorDetails);
        });
    });
});
