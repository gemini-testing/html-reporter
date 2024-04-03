'use strict';

const fs = require('fs-extra');
const _ = require('lodash');
const proxyquire = require('proxyquire');
const serverUtils = require('lib/server-utils');
const {TestplaneTestAdapter} = require('lib/test-adapter/testplane');
const {SqliteClient} = require('lib/sqlite-client');
const {GuiTestsTreeBuilder} = require('lib/tests-tree-builder/gui');
const {HtmlReporter} = require('lib/plugin-api');
const {FAIL, UPDATED} = require('lib/constants/test-statuses');
const {LOCAL_DATABASE_NAME} = require('lib/constants/database');
const {ImagesInfoSaver} = require('lib/images-info-saver');
const sinon = require('sinon');
const {SKIPPED, SUCCESS, ERROR} = require('lib/constants');

const TEST_REPORT_PATH = 'test';
const TEST_DB_PATH = `${TEST_REPORT_PATH}/${LOCAL_DATABASE_NAME}`;

describe('GuiReportBuilder', () => {
    const sandbox = sinon.sandbox.create();
    let hasImage, deleteFile, GuiReportBuilder, dbClient, copyAndUpdate, imagesInfoSaver;

    const mkGuiReportBuilder_ = async ({toolConfig, pluginConfig} = {}) => {
        toolConfig = _.defaults(toolConfig || {}, {getAbsoluteUrl: _.noop});
        pluginConfig = _.defaults(pluginConfig || {}, {baseHost: '', path: TEST_REPORT_PATH, baseTestPath: ''});

        const htmlReporter = HtmlReporter.create({baseHost: ''});

        const browserConfigStub = {getAbsoluteUrl: toolConfig.getAbsoluteUrl};
        const testplane = {
            forBrowser: sandbox.stub().returns(browserConfigStub),
            htmlReporter
        };

        TestplaneTestAdapter.create = (obj) => obj;

        dbClient = await SqliteClient.create({htmlReporter, reportPath: TEST_REPORT_PATH});
        imagesInfoSaver = sinon.createStubInstance(ImagesInfoSaver);
        imagesInfoSaver.save.callsFake(_.identity);

        const reportBuilder = GuiReportBuilder.create(testplane.htmlReporter, pluginConfig, {dbClient, imagesInfoSaver});

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

        const imagesInfoSaver = sandbox.createStubInstance(ImagesInfoSaver);

        hasImage = sandbox.stub().returns(true);
        deleteFile = sandbox.stub().resolves();
        GuiReportBuilder = proxyquire('lib/report-builder/gui', {
            './static': {
                StaticReportBuilder: proxyquire('lib/report-builder/static', {
                    '../sqlite-client': {SqliteClient},
                    '../image-handler': {ImageHandler: function() {
                        return imagesInfoSaver;
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

    describe('"addTestResult" method', () => {
        it('should add skipped test results to skips', async () => {
            const reportBuilder = await mkGuiReportBuilder_();

            await reportBuilder.addTestResult(stubTest_({
                status: SKIPPED,
                fullName: 'some-name',
                skipReason: 'some-reason',
                browserId: 'some-browser'
            }));

            const result = reportBuilder.getResult();

            assert.deepEqual(result.skips[0], {suite: 'some-name', comment: 'some-reason', browser: 'some-browser'});
        });

        it('should load images info from previous attempt', async () => {
            const reportBuilder = await mkGuiReportBuilder_();
            GuiTestsTreeBuilder.prototype.getImagesInfo.returns([
                {stateName: 'state-1', status: SUCCESS},
                {stateName: 'state-2', status: ERROR}
            ]);

            copyAndUpdate.callsFake(_.assign);
            const enrichedResult = await reportBuilder.addTestResult(stubTest_({
                status: UPDATED,
                imagesInfo: [{stateName: 'state-2', status: UPDATED}]
            }));

            assert.deepEqual(enrichedResult.imagesInfo, [
                {stateName: 'state-1', status: SUCCESS},
                {stateName: 'state-2', status: UPDATED}
            ]);
        });

        it('should load images info from previous attempt, while being overrided with fail status', async () => {
            const reportBuilder = await mkGuiReportBuilder_();
            GuiTestsTreeBuilder.prototype.getImagesInfo.returns([
                {stateName: 'state-1', status: ERROR},
                {stateName: 'state-2', status: ERROR}
            ]);

            copyAndUpdate.callsFake(_.assign);
            const enrichedResult = await reportBuilder.addTestResult(stubTest_({
                status: UPDATED,
                imagesInfo: [{stateName: 'state-2', status: UPDATED}]
            }), {status: FAIL});

            assert.equal(enrichedResult.status, FAIL);
            assert.deepEqual(enrichedResult.imagesInfo, [
                {stateName: 'state-1', status: ERROR},
                {stateName: 'state-2', status: UPDATED}
            ]);
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

    describe('"getUpdatedReferenceTestStatus"', () => {
        it('should return estimated by determineStatus status', async () => {
            const reportBuilder = await mkGuiReportBuilder_();
            const testResult = {id: 'result-id', imagesInfo: [{stateName: 'foo'}]};
            const testBranch = {result: {status: 'fail', error: 'some-error'}, images: [{stateName: 'foo'}, {stateName: 'bar'}]};
            GuiTestsTreeBuilder.prototype.getTestBranch.withArgs('result-id').returns(testBranch);

            const estimatedStatus = reportBuilder.getUpdatedReferenceTestStatus(testResult);

            assert.equal(estimatedStatus, ERROR);
        });

        it('should return "updated", if there are no errors', async () => {
            const reportBuilder = await mkGuiReportBuilder_();
            const testResult = {id: 'result-id', imagesInfo: [{stateName: 'foo'}]};
            const testBranch = {result: {status: 'fail'}, images: [{stateName: 'foo'}]};
            GuiTestsTreeBuilder.prototype.getTestBranch.withArgs('result-id').returns(testBranch);

            const estimatedStatus = reportBuilder.getUpdatedReferenceTestStatus(testResult);

            assert.equal(estimatedStatus, UPDATED);
        });
    });

    describe('add test result to tree', () => {
        describe('should pass test result with', () => {
            it('"suiteUrl" field', async () => {
                const reportBuilder = await mkGuiReportBuilder_();

                await reportBuilder.addTestResult(stubTest_({
                    url: 'some-url'
                }));

                assert.equal(getTestResult_().url, 'some-url');
            });

            it('"name" field as browser id', async () => {
                const reportBuilder = await mkGuiReportBuilder_();

                await reportBuilder.addTestResult(stubTest_({browserId: 'yabro'}));

                assert.equal(getTestResult_().browserId, 'yabro');
            });

            it('"metaInfo" field', async () => {
                const reportBuilder = await mkGuiReportBuilder_();

                await reportBuilder.addTestResult(stubTest_({
                    meta: {some: 'value', sessionId: '12345', file: '/path/file.js', url: '/test/url'}
                }));

                const expectedMetaInfo = {some: 'value', sessionId: '12345', file: '/path/file.js', url: '/test/url'};

                assert.deepEqual(getTestResult_().meta, expectedMetaInfo);
            });

            [
                {name: 'description', value: 'some-descr'},
                {name: 'imagesInfo', value: ['some-images']},
                {name: 'screenshot', value: false},
                {name: 'multipleTabs', value: true}
            ].forEach(({name, value}) => {
                it(`add "${name}" field`, async () => {
                    const reportBuilder = await mkGuiReportBuilder_();

                    await reportBuilder.addTestResult(stubTest_({[name]: value}));

                    assert.deepEqual(getTestResult_()[name], value);
                });
            });
        });
    });
});
