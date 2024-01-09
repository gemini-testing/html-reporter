import * as fsOriginal from 'fs-extra';
import {ImagesInfoSaver as ImagesInfoSaverOriginal} from 'lib/images-info-saver';
import {Writable} from 'type-fest';
import {ReporterTestResult} from 'lib/test-adapter';
import {
    ImageBase64,
    ImageBuffer,
    ImageFile,
    ImageInfoDiff,
    ImageInfoNoRef,
    ImageInfoSuccess,
    TestSpecByPath
} from 'lib/types';
import sinon from 'sinon';
import {LocalImageFileSaver} from 'lib/local-image-file-saver';
import {SqliteImageStore} from 'lib/image-store';
import {Cache} from 'lib/cache';
import {PluginEvents, TestStatus} from 'lib/constants';
import proxyquire from 'proxyquire';
import _ from 'lodash';
import {RegisterWorkers} from 'lib/workers/create-workers';

describe('images-info-saver', () => {
    const sandbox = sinon.sandbox.create();

    describe('save', () => {
        const fs = _.clone(fsOriginal);

        const originalUtils = proxyquire('lib/server-utils', {
            'fs-extra': fs
        });
        const utils = _.clone(originalUtils);

        const {ImagesInfoSaver} = proxyquire('lib/images-info-saver', {
            'fs-extra': fs,
            './server-utils': utils,
            'image-size': sinon.stub()
        });

        let imagesInfoSaver: ImagesInfoSaverOriginal;
        let imageFileSaver: sinon.SinonStubbedInstance<typeof LocalImageFileSaver>;
        let imageStore: sinon.SinonStubbedInstance<SqliteImageStore>;
        let expectedPathsCache: sinon.SinonStubbedInstance<Cache<[TestSpecByPath, string | undefined], string>>;
        let reportPath: string;

        beforeEach(() => {
            sandbox.stub(fs, 'readFile');
            sandbox.stub(fs, 'copy');
            sandbox.stub(fs, 'writeFile');

            sandbox.stub(utils, 'makeDirFor').resolves();
            sandbox.stub(utils, 'getCurrentPath').returns('report-current-path');
            sandbox.stub(utils, 'getDiffPath').returns('report-diff-path');
            sandbox.stub(utils, 'getReferencePath').returns('report-expected-path');
            sandbox.stub(utils, 'getTempPath').returns('temp-path');

            reportPath = 'test-report-path';
            imageFileSaver = {
                saveImg: sinon.stub()
            };
            imageStore = sinon.createStubInstance(SqliteImageStore);
            expectedPathsCache = sinon.createStubInstance(Cache);

            imagesInfoSaver = new ImagesInfoSaver({
                imageFileSaver,
                reportPath,
                imageStore,
                expectedPathsCache: expectedPathsCache as any
            });
        });

        afterEach(() => {
            sandbox.restore();
        });

        describe('actual images', () => {
            it('should save and update path', async () => {
                const testResult: Writable<ReporterTestResult> = {} as ReporterTestResult;

                const sourcePath = 'path/to/actual-image.png';
                const destPath = 'path/to/saved-actual-image.png';

                const actualImg: ImageFile = {path: sourcePath, size: {width: 100, height: 100}};
                const imagesInfo = [{actualImg} as ImageInfoNoRef];

                imageFileSaver.saveImg.resolves(destPath);
                testResult.imagesInfo = imagesInfo;

                const updatedTestResult = await imagesInfoSaver.save(testResult);

                const savedActualImg = updatedTestResult.imagesInfo[0].actualImg as ImageFile;
                assert.calledWith(imageFileSaver.saveImg, sourcePath, sinon.match({reportDir: reportPath, destPath: 'report-current-path'}));
                assert.equal(savedActualImg.path, destPath);
            });

            it('should not fail if it\'s not available', async () => {
                const testResult: Writable<ReporterTestResult> = {} as ReporterTestResult;

                testResult.imagesInfo = [{} as ImageInfoNoRef];

                const updatedTestResult = await imagesInfoSaver.save(testResult);

                assert.notCalled(imageFileSaver.saveImg);
                assert.isUndefined(updatedTestResult.imagesInfo[0].actualImg);
            });

            it('should save base64 page screenshots', async () => {
                const testResult: Writable<ReporterTestResult> = {} as ReporterTestResult;

                const actualImg: ImageBase64 = {base64: 'base64string', size: {width: 100, height: 100}};
                testResult.imagesInfo = [{status: TestStatus.SUCCESS, actualImg}];

                imageFileSaver.saveImg.resolves('path/to/saved-base64-image.png');

                const updatedTestResult = await imagesInfoSaver.save(testResult);

                const savedActualImg = updatedTestResult.imagesInfo[0].actualImg as ImageFile;
                assert.calledWith(imageFileSaver.saveImg, 'temp-path');
                assert.equal(savedActualImg.path, 'path/to/saved-base64-image.png');
            });
        });

        describe('diff images', () => {
            it('should generate diff in worker if needed', async () => {
                const testResult: Writable<ReporterTestResult> = {} as ReporterTestResult;

                const actualImg = {path: 'actual-path'} as ImageFile;
                const expectedImg = {path: 'expected-path'} as ImageFile;
                const imagesInfo = {status: TestStatus.FAIL, actualImg, expectedImg} as ImageInfoDiff;
                testResult.imagesInfo = [imagesInfo];

                const saveDiffToStub = sinon.stub().resolves();
                const workers = {saveDiffTo: saveDiffToStub} as unknown as RegisterWorkers<['saveDiffTo']>;

                sandbox.stub(utils, 'createHash').returns('123');

                const updatedTestResult = await imagesInfoSaver.save(testResult, workers);

                const savedDiffImg = (updatedTestResult.imagesInfo[0] as ImageInfoDiff).diffImg as ImageFile;
                assert.calledWith(saveDiffToStub, sinon.match({
                    reference: expectedImg.path,
                    current: actualImg.path
                }), 'report-diff-path');
                assert.calledWith(imageFileSaver.saveImg, 'report-diff-path', {reportDir: reportPath, destPath: 'report-diff-path'});
                assert.equal(savedDiffImg.path, 'report-diff-path');
            });

            it('should do nothing unless needed', async () => {
                const testResult: Writable<ReporterTestResult> = {} as ReporterTestResult;

                const imagesInfo = {status: TestStatus.SUCCESS} as ImageInfoSuccess;
                testResult.imagesInfo = [imagesInfo];

                const saveDiffToStub = sinon.stub().resolves();
                const workers = {saveDiffTo: saveDiffToStub} as unknown as RegisterWorkers<['saveDiffTo']>;

                await imagesInfoSaver.save(testResult, workers);

                assert.notCalled(saveDiffToStub);
                assert.notCalled(imageFileSaver.saveImg);
            });

            it('should save and update path when diff image path is provided', async () => {
                const testResult: Writable<ReporterTestResult> = {} as ReporterTestResult;

                const diffImg = {path: 'diff-path'} as ImageFile;
                const imagesInfo = {status: TestStatus.FAIL, diffImg} as ImageInfoDiff;
                testResult.imagesInfo = [imagesInfo];

                const saveDiffToStub = sinon.stub().resolves();
                const workers = {saveDiffTo: saveDiffToStub} as unknown as RegisterWorkers<['saveDiffTo']>;

                sandbox.stub(utils, 'createHash').returns('123');

                const updatedTestResult = await imagesInfoSaver.save(testResult, workers);

                const savedDiffImg = (updatedTestResult.imagesInfo[0] as ImageInfoDiff).diffImg as ImageFile;
                assert.notCalled(saveDiffToStub);
                assert.calledWith(imageFileSaver.saveImg, 'diff-path', {reportDir: reportPath, destPath: 'report-diff-path'});
                assert.equal(savedDiffImg.path, 'report-diff-path');
            });

            it('should work fine with buffer', async () => {
                const testResult: Writable<ReporterTestResult> = {} as ReporterTestResult;

                const diffImg = {buffer: Buffer.from('')} as ImageBuffer;
                const imagesInfo = {status: TestStatus.FAIL, diffImg} as ImageInfoDiff;
                testResult.imagesInfo = [imagesInfo];

                const saveDiffToStub = sinon.stub().resolves();
                const workers = {saveDiffTo: saveDiffToStub} as unknown as RegisterWorkers<['saveDiffTo']>;

                sandbox.stub(utils, 'createHash').returns('123');

                const updatedTestResult = await imagesInfoSaver.save(testResult, workers);

                const savedDiffImg = (updatedTestResult.imagesInfo[0] as ImageInfoDiff).diffImg as ImageFile;
                assert.notCalled(saveDiffToStub);
                assert.calledWith(imageFileSaver.saveImg, 'temp-path', {reportDir: reportPath, destPath: 'report-diff-path'});
                assert.equal(savedDiffImg.path, 'report-diff-path');
            });
        });

        describe('expected images', () => {
            it('should save and update path', async () => {
                const testResult: Writable<ReporterTestResult> = {} as ReporterTestResult;

                const expectedImg = {path: 'expected-path'} as ImageFile;
                const imagesInfo = {status: TestStatus.FAIL, expectedImg} as ImageInfoDiff;
                testResult.imagesInfo = [imagesInfo];

                const updatedTestResult = await imagesInfoSaver.save(testResult);

                const savedExpectedImg = (updatedTestResult.imagesInfo[0] as ImageInfoDiff).expectedImg as ImageFile;
                assert.calledWith(imageFileSaver.saveImg, 'expected-path', {reportDir: reportPath, destPath: 'report-expected-path'});
                assert.equal(savedExpectedImg.path, 'report-expected-path');
            });
            it('should reuse previous images from cache', async () => {
                const testResult: Writable<ReporterTestResult> = {} as ReporterTestResult;

                const expectedImg = {path: 'expected-path'} as ImageFile;
                const imagesInfo = {status: TestStatus.FAIL, expectedImg} as ImageInfoDiff;
                testResult.imagesInfo = [imagesInfo];

                expectedPathsCache.has.returns(true);
                expectedPathsCache.get.returns('cached-expected-path');

                const updatedTestResult = await imagesInfoSaver.save(testResult);

                const savedExpectedImg = (updatedTestResult.imagesInfo[0] as ImageInfoDiff).expectedImg as ImageFile;
                assert.notCalled(imageFileSaver.saveImg);
                assert.equal(savedExpectedImg.path, 'cached-expected-path');
            });
        });

        it('should emit TEST_SCREENSHOTS_SAVED event', async () => {
            const testResult: Writable<ReporterTestResult> = {
                fullName: 'some-name',
                browserId: 'some-browser',
                attempt: 0
            } as ReporterTestResult;

            const sourcePath = 'path/to/actual-image.png';
            const destPath = 'path/to/saved-actual-image.png';

            const actualImg: ImageFile = {path: sourcePath, size: {width: 100, height: 100}};
            const imagesInfo = [{actualImg} as ImageInfoNoRef];

            imageFileSaver.saveImg.resolves(destPath);
            testResult.imagesInfo = imagesInfo;

            const eventHandler = sinon.stub();
            imagesInfoSaver.on(PluginEvents.TEST_SCREENSHOTS_SAVED, eventHandler);

            const updatedTestResult = await imagesInfoSaver.save(testResult);

            assert.calledWith(imageFileSaver.saveImg, sourcePath, sinon.match({reportDir: reportPath, destPath: 'report-current-path'}));
            assert.calledWith(eventHandler, sinon.match({
                testId: 'some-name.some-browser',
                attempt: 0,
                imagesInfo: updatedTestResult.imagesInfo
            }));
        });
    });
});
