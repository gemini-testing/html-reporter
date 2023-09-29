import * as fsOriginal from 'fs-extra';
import _ from 'lodash';
import proxyquire from 'proxyquire';
import sinon, {SinonStubbedInstance} from 'sinon';
import type tmpOriginal from 'tmp';

import type * as originalUtils from 'lib/server-utils';
import {logger} from 'lib/common-utils';
import {ImageHandler as ImageHandlerOriginal} from 'lib/image-handler';
import {RegisterWorkers} from 'lib/workers/create-workers';
import {AssertViewResult, ImageInfoFail, ImageInfoFull, ImageInfoSuccess, ImagesSaver} from 'lib/types';
import {ErrorName, ImageDiffError} from 'lib/errors';
import {ImageStore} from 'lib/image-store';
import {FAIL, PluginEvents, SUCCESS, UPDATED} from 'lib/constants';
import {ReporterTestResult} from 'lib/test-adapter';

describe('image-handler', function() {
    const sandbox = sinon.sandbox.create();
    let fs: sinon.SinonStubbedInstance<typeof fsOriginal>;
    let utils: sinon.SinonStubbedInstance<typeof originalUtils>;
    let tmp: typeof tmpOriginal;
    let err: AssertViewResult;
    let ImageHandler: typeof ImageHandlerOriginal;
    const cacheExpectedPaths = new Map<string, string>(),
        cacheAllImages = new Map<string, string>(),
        cacheDiffImages = new Map<string, string>();

    class ImageDiffErrorStub extends Error {
        name = ErrorName.IMAGE_DIFF;
    }
    class NoRefImageErrorStub extends Error {
        name = ErrorName.NO_REF_IMAGE;
    }

    const mkImageStore = (): SinonStubbedInstance<ImageStore> => ({getLastImageInfoFromDb: sinon.stub()} as SinonStubbedInstance<ImageStore>);

    const mkImagesSaver = (): SinonStubbedInstance<ImagesSaver> => ({saveImg: sinon.stub()} as SinonStubbedInstance<ImagesSaver>);

    const mkTestResult = (result: Partial<ReporterTestResult>): ReporterTestResult => _.defaults(result, {
        id: 'some-id',
        attempt: 0,
        fullName: 'default-title'
    }) as ReporterTestResult;

    const mkErrStub = (ErrType: typeof ImageDiffErrorStub | typeof NoRefImageErrorStub = ImageDiffErrorStub, {stateName, currImg, refImg, diffBuffer}: Partial<ImageDiffError> = {}): AssertViewResult => {
        const err: AssertViewResult = new ErrType() as any;

        err.stateName = stateName || 'plain';
        (err as ImageDiffError).currImg = currImg || {path: 'curr/path'} as any;
        err.refImg = refImg || {path: 'ref/path'} as any;
        (err as ImageDiffError).diffBuffer = diffBuffer;

        return err;
    };

    const mkWorker = (): sinon.SinonStubbedInstance<RegisterWorkers<['saveDiffTo']>> => {
        return {saveDiffTo: sandbox.stub()} as any;
    };

    beforeEach(() => {
        fs = sinon.stub(_.clone(fsOriginal));
        err = mkErrStub();
        tmp = {tmpdir: 'default/dir'} as any;

        const originalUtils = proxyquire('lib/server-utils', {
            'fs-extra': fs
        });
        utils = _.clone(originalUtils);

        ImageHandler = proxyquire('lib/image-handler', {
            tmp,
            'fs-extra': fs,
            './server-utils': utils,
            './image-cache': {cacheExpectedPaths, cacheAllImages, cacheDiffImages}
        }).ImageHandler;

        sandbox.stub(utils, 'getCurrentPath').returns('');
        sandbox.stub(utils, 'getDiffPath').returns('');
        sandbox.stub(utils, 'getReferencePath').returns('');

        fs.readFile.resolves(Buffer.from(''));
        fs.writeFile.resolves();
        fs.copy.resolves();
    });

    afterEach(() => {
        sandbox.restore();

        cacheExpectedPaths.clear();
        cacheAllImages.clear();
        cacheDiffImages.clear();
    });

    describe('saveTestImages', () => {
        it('should build diff to tmp dir', async () => {
            (tmp as any).tmpdir = 'tmp/dir';
            const testResult = mkTestResult({
                assertViewResults: [err]
            });
            utils.getDiffPath.returns('diff/report/path');

            const imageHandler = new ImageHandler(mkImageStore(), mkImagesSaver(), {reportPath: 'some-dir'});
            const worker = mkWorker();
            await imageHandler.saveTestImages(testResult, worker);

            assert.calledOnceWith(worker.saveDiffTo, err, sinon.match('tmp/dir/diff/report/path'));
        });

        it('should save diff in report from tmp dir using external storage', async () => {
            (tmp as any).tmpdir = 'tmp/dir';
            const testResult = mkTestResult({
                assertViewResults: [err]
            });
            utils.getDiffPath.returns('diff/report/path');
            const imagesSaver = mkImagesSaver();
            const imageHandler = new ImageHandler(mkImageStore(), imagesSaver, {reportPath: 'html-report/path'});
            const worker = mkWorker();
            await imageHandler.saveTestImages(testResult, worker);

            assert.calledWith(
                imagesSaver.saveImg,
                sinon.match('tmp/dir/diff/report/path'),
                {destPath: 'diff/report/path', reportDir: 'html-report/path'}
            );
        });

        it('should emit TEST_SCREENSHOTS_SAVED event', async () => {
            (tmp as any).tmpdir = 'tmp/dir';
            const testResult = mkTestResult({
                browserId: 'chrome',
                assertViewResults: [err]
            });
            utils.getDiffPath.returns('diff/report/path');

            const imageHandler = new ImageHandler(mkImageStore(), mkImagesSaver(), {reportPath: ''});
            sinon.stub(imageHandler, 'getImagesInfo').returns([{test: 123}]);
            const worker = mkWorker();

            const screenshotsSavedHandler = sinon.stub();
            imageHandler.on(PluginEvents.TEST_SCREENSHOTS_SAVED, screenshotsSavedHandler);

            await imageHandler.saveTestImages(testResult, worker);

            assert.calledOnceWith(screenshotsSavedHandler, {
                attempt: 0,
                testId: 'default-title.chrome',
                imagesInfo: [{test: 123}]
            });
        });

        describe('saving error screenshot', () => {
            beforeEach(() => {
                sandbox.stub(logger, 'warn');
                sandbox.stub(utils, 'makeDirFor').resolves();
                sandbox.stub(utils, 'copyFileAsync');
            });

            describe('if screenshot on reject does not exist', () => {
                it('should not save screenshot', () => {
                    const testResult = mkTestResult({
                        error: {screenshot: {base64: null}} as any,
                        assertViewResults: []
                    });
                    const hermioneTestAdapter = new ImageHandler(mkImageStore(), mkImagesSaver(), {reportPath: ''});

                    return hermioneTestAdapter.saveTestImages(testResult, mkWorker())
                        .then(() => assert.notCalled(fs.writeFile));
                });

                it('should warn about it', () => {
                    const testResult = mkTestResult({
                        screenshot: {base64: null} as any,
                        assertViewResults: []
                    });
                    const imageHandler = new ImageHandler(mkImageStore(), mkImagesSaver(), {reportPath: ''});

                    return imageHandler.saveTestImages(testResult, mkWorker())
                        .then(() => assert.calledWith(logger.warn as sinon.SinonStub, 'Cannot save screenshot on reject'));
                });
            });

            it('should create directory for screenshot', () => {
                const testResult = mkTestResult({
                    screenshot: {base64: 'base64-data'} as any,
                    assertViewResults: []
                });
                utils.getCurrentPath.returns('dest/path');
                const imageHandler = new ImageHandler(mkImageStore(), mkImagesSaver(), {reportPath: ''});

                return imageHandler.saveTestImages(testResult, mkWorker())
                    .then(() => assert.calledOnceWith(utils.makeDirFor, sinon.match('dest/path')));
            });

            it('should save screenshot from base64 format', async () => {
                const testResult = mkTestResult({
                    screenshot: {base64: 'base64-data'} as any,
                    assertViewResults: []
                });
                utils.getCurrentPath.returns('dest/path');
                const bufData = new Buffer('base64-data', 'base64');
                const imagesSaver = mkImagesSaver();
                const imageHandler = new ImageHandler(mkImageStore(), imagesSaver, {reportPath: 'report/path'});

                await imageHandler.saveTestImages(testResult, mkWorker());

                assert.calledOnceWith(fs.writeFile, sinon.match('dest/path'), bufData, 'base64');
                assert.calledWith(imagesSaver.saveImg, sinon.match('dest/path'), {destPath: 'dest/path', reportDir: 'report/path'});
            });
        });

        describe('saving reference image', () => {
            it('should save reference, if it is not reused', async () => {
                (tmp as any).tmpdir = 'tmp/dir';
                const testResult = mkTestResult({assertViewResults: [err]});
                utils.getReferencePath.returns('ref/report/path');
                const imagesSaver = mkImagesSaver();
                const imageHandler = new ImageHandler(mkImageStore(), imagesSaver, {reportPath: 'html-report/path'});

                await imageHandler.saveTestImages(testResult, mkWorker());

                assert.calledWith(
                    imagesSaver.saveImg, 'ref/path',
                    {destPath: 'ref/report/path', reportDir: 'html-report/path'}
                );
            });

            it('should not save reference, if it is reused', async () => {
                (tmp as any).tmpdir = 'tmp/dir';
                const error = mkErrStub(ImageDiffErrorStub, {stateName: 'plain'});
                const testResult = mkTestResult({assertViewResults: [error], browserId: 'browser-id'});
                utils.getReferencePath.returns('ref/report/path');
                const imagesSaver = mkImagesSaver();
                cacheExpectedPaths.set('da89771#plain', 'ref/report/path');
                const imageHandler = new ImageHandler(mkImageStore(), imagesSaver, {reportPath: 'html-report/path'});

                await imageHandler.saveTestImages(testResult, mkWorker());

                assert.neverCalledWith(
                    imagesSaver.saveImg, 'ref/path',
                    {destPath: 'ref/report/path', reportDir: 'html-report/path'}
                );
            });

            it('should save png buffer, if it is passed', async () => {
                const error = mkErrStub(ImageDiffErrorStub, {stateName: 'plain', diffBuffer: 'foo' as any});
                const testResult = mkTestResult({assertViewResults: [error]});
                utils.getDiffPath.returns('diff/report/path');

                const imageHandler = new ImageHandler(mkImageStore(), mkImagesSaver(), {reportPath: ''});
                const workers = {saveDiffTo: sandbox.stub()};
                await imageHandler.saveTestImages(testResult, mkWorker());

                assert.calledOnceWith(fs.writeFile, sinon.match('diff/report/path'), Buffer.from('foo'));
                assert.notCalled(workers.saveDiffTo);
            });
        });
    });

    ([
        {field: 'refImg', method: 'getRefImg'},
        {field: 'currImg', method: 'getCurrImg'}
    ] as const).forEach(({field, method}) => {
        describe(`${method}`, () => {
            it(`should return ${field} from test result`, () => {
                const testResult = mkTestResult({assertViewResults: [
                        {[field]: 'some-value', stateName: 'plain'} as any]});

                assert.equal((ImageHandler[method])(testResult.assertViewResults, 'plain'), 'some-value' as any);
            });
        });
    });

    describe('getScreenshot', () => {
        it('should return error screenshot from test result', () => {
            const testResult = mkTestResult({screenshot: 'some-value'} as any);

            assert.equal(ImageHandler.getScreenshot(testResult), 'some-value' as any);
        });
    });

    describe('getImagesInfo', () => {
        beforeEach(() => {
            sandbox.stub(utils, 'copyFileAsync');
            utils.getReferencePath.returns('some/ref.png');
        });

        it('should return diffClusters', () => {
            const testResult = mkTestResult({
                assertViewResults: [{diffClusters: [{left: 0, top: 0, right: 1, bottom: 1}]}] as any
            });
            const imageHandler = new ImageHandler(mkImageStore(), mkImagesSaver(), {reportPath: ''});

            const [{diffClusters}] = imageHandler.getImagesInfo(testResult) as ImageInfoFail[];

            assert.deepEqual(diffClusters, [{left: 0, top: 0, right: 1, bottom: 1}]);
        });

        it('should return saved images', async () => {
            const testResult = mkTestResult({
                assertViewResults: [mkErrStub()],
                status: SUCCESS
            });

            const imagesSaver = mkImagesSaver();
            imagesSaver.saveImg.withArgs(
                'ref/path',
                {destPath: 'some/ref.png', reportDir: 'some/rep'}
            ).returns('saved/ref.png');
            const imageHandler = new ImageHandler(mkImageStore(), imagesSaver, {reportPath: 'some/rep'});
            const workers = mkWorker();

            await imageHandler.saveTestImages(testResult, workers);

            const {expectedImg} = imageHandler.getImagesFor(testResult, SUCCESS, 'plain') as ImageInfoSuccess;
            assert.equal(expectedImg.path, 'saved/ref.png');
        });

        it('should return dest image path by default', async () => {
            const testResult = mkTestResult({
                assertViewResults: [mkErrStub()],
                status: SUCCESS
            });

            const imagesSaver = mkImagesSaver();
            const imageHandler = new ImageHandler(mkImageStore(), imagesSaver, {reportPath: 'some/rep'});
            const workers = mkWorker();

            await imageHandler.saveTestImages(testResult, workers);

            const {expectedImg} = imageHandler.getImagesFor(testResult, SUCCESS, 'plain') as ImageInfoSuccess;
            assert.equal(expectedImg.path, 'some/ref.png');
        });

        it('should return ref image path after update image for NoRefImageError', async () => {
            const testResult = mkTestResult({
                assertViewResults: [mkErrStub(NoRefImageErrorStub)],
                status: UPDATED
            });

            const imagesSaver = mkImagesSaver();
            const imageHandler = new ImageHandler(mkImageStore(), imagesSaver, {reportPath: 'some/rep'});
            const workers = mkWorker();

            await imageHandler.saveTestImages(testResult, workers);

            const {expectedImg} = imageHandler.getImagesFor(testResult, UPDATED, 'plain') as ImageInfoSuccess;
            assert.equal(expectedImg.path, 'some/ref.png');
        });

        describe('expected path', () => {
            const mkLastImageInfo_ = (opts = {}): ImageInfoFull => {
                const {stateName, expectedImgPath} = _.defaults(opts, {
                    stateName: 'plain',
                    expectedImgPath: 'default/expected/img/path.png'
                });

                return {
                    stateName,
                    expectedImg: {
                        path: expectedImgPath
                    }
                } as any;
            };

            it('should be pulled from the store if exists', async () => {
                const testResult = mkTestResult({
                    fullName: 'some-title',
                    assertViewResults: [mkErrStub()]
                });
                const imageStore = mkImageStore();
                imageStore.getLastImageInfoFromDb.withArgs(testResult, 'plain').returns(mkLastImageInfo_());

                const imageHandler = new ImageHandler(imageStore, mkImagesSaver(), {reportPath: ''});

                imageHandler.getImagesFor(testResult, FAIL, 'plain');

                assert.notCalled(utils.getReferencePath);
            });

            it('should be generated if does not exist in store', async () => {
                const testResult = mkTestResult({
                    fullName: 'some-title',
                    assertViewResults: [mkErrStub()]
                });
                const imageStore = mkImageStore();
                imageStore.getLastImageInfoFromDb.withArgs(testResult, 'plain').returns(undefined);

                const imageHandler = new ImageHandler(imageStore, mkImagesSaver(), {reportPath: ''});

                imageHandler.getImagesFor(testResult, FAIL, 'plain');

                assert.calledOnce(utils.getReferencePath);
            });

            it('should be generated on update', async () => {
                const testResult = mkTestResult({
                    assertViewResults: [mkErrStub()],
                    fullName: 'some-title',
                    status: UPDATED
                });
                const imageStore = mkImageStore();
                imageStore.getLastImageInfoFromDb.withArgs(testResult, 'plain').returns(mkLastImageInfo_());
                const imageHandler = new ImageHandler(imageStore, mkImagesSaver(), {reportPath: ''});

                imageHandler.getImagesFor(testResult, UPDATED, 'plain');

                assert.calledOnce(utils.getReferencePath);
            });

            it('should be queried from the database for each browser', async () => {
                const chromeTestResult = mkTestResult({browserId: 'chrome'});
                const firefoxTestResult = mkTestResult({browserId: 'firefox'});

                const imageStore = mkImageStore();
                const imageHandler = new ImageHandler(imageStore, mkImagesSaver(), {reportPath: ''});

                imageHandler.getImagesFor(chromeTestResult, FAIL, 'plain');
                imageHandler.getImagesFor(firefoxTestResult, FAIL, 'plain');

                assert.calledTwice(imageStore.getLastImageInfoFromDb);
                assert.calledWith(imageStore.getLastImageInfoFromDb.firstCall, chromeTestResult, 'plain');
                assert.calledWith(imageStore.getLastImageInfoFromDb.secondCall, firefoxTestResult, 'plain');
            });

            it('should be queried from the database once per state', async () => {
                const testResult = mkTestResult({
                    fullName: 'some-title',
                    assertViewResults: [mkErrStub()]
                });
                const imageStore = mkImageStore();
                imageStore.getLastImageInfoFromDb.returns(mkLastImageInfo_());
                const imageHandler = new ImageHandler(imageStore, mkImagesSaver(), {reportPath: ''});

                imageHandler.getImagesFor(testResult, FAIL, 'plain');
                imageHandler.getImagesFor(testResult, FAIL, 'plain');

                assert.calledOnce(imageStore.getLastImageInfoFromDb);
            });
        });
    });
});
