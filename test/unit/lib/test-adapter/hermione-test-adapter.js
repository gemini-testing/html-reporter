'use strict';

const _ = require('lodash');
const utils = require('lib/server-utils');
const {SUCCESS} = require('lib/constants/test-statuses');
const {ERROR_DETAILS_PATH} = require('lib/constants/paths');
const {stubTool, stubConfig} = require('../../utils');
const proxyquire = require('proxyquire');
const fs = require('fs-extra');

describe('hermione test adapter', () => {
    const sandbox = sinon.sandbox.create();
    let tmp, HermioneTestResultAdapter, err, getSuitePath;

    class ImageDiffError extends Error {}
    class NoRefImageError extends Error {}

    const mkHermioneTestResultAdapter = (testResult, toolOpts = {}, htmlReporter = {}) => {
        const config = _.defaults(toolOpts.config, {
            browsers: {
                bro: {}
            }
        });

        const tool = stubTool(
            stubConfig(config),
            {},
            {ImageDiffError, NoRefImageError},
            Object.assign({imagesSaver: {saveImg: sandbox.stub()}}, htmlReporter)
        );

        return new HermioneTestResultAdapter(testResult, tool);
    };

    const mkTestResult_ = (result) => _.defaults(result, {
        id: () => 'some-id',
        fullTitle: () => 'default-title'
    });

    const mkErrStub = (ErrType = ImageDiffError) => {
        const err = new ErrType();

        err.stateName = 'plain';
        err.currImg = {path: 'curr/path'};
        err.refImg = {path: 'ref/path'};

        return err;
    };

    beforeEach(() => {
        tmp = {tmpdir: 'default/dir'};
        getSuitePath = sandbox.stub();

        HermioneTestResultAdapter = proxyquire('../../../../lib/test-adapter/hermione-test-adapter', {
            tmp,
            '../plugin-utils': {getHermioneUtils: () => ({getSuitePath})}
        });
        sandbox.stub(utils, 'getCurrentPath').returns('');
        sandbox.stub(utils, 'getDiffPath').returns('');
        sandbox.stub(fs, 'readFile').resolves(Buffer.from(''));
        sandbox.stub(fs, 'copy').resolves();
        err = mkErrStub();
    });

    afterEach(() => sandbox.restore());

    it('should return suite attempt', () => {
        const firstTestResult = mkTestResult_({fullTitle: () => 'some-title'});
        const secondTestResult = mkTestResult_({fullTitle: () => 'other-title'});

        mkHermioneTestResultAdapter(firstTestResult);

        assert.equal(mkHermioneTestResultAdapter(firstTestResult).attempt, 1);
        assert.equal(mkHermioneTestResultAdapter(secondTestResult).attempt, 0);
    });

    it('should return test error with "message", "stack" and "stateName"', () => {
        const testResult = mkTestResult_({
            err: {
                message: 'some-message', stack: 'some-stack', stateName: 'some-test', foo: 'bar'
            }
        });

        const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

        assert.deepEqual(hermioneTestAdapter.error, {
            message: 'some-message',
            stack: 'some-stack',
            stateName: 'some-test'
        });
    });

    it('should return test state', () => {
        const testResult = mkTestResult_({title: 'some-test'});

        const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

        assert.deepEqual(hermioneTestAdapter.state, {name: 'some-test'});
    });

    it('should return assert view results', () => {
        const testResult = mkTestResult_({assertViewResults: [1]});

        const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

        assert.deepEqual(hermioneTestAdapter.assertViewResults, [1]);
    });

    describe('error details', () => {
        let getDetailsFileName;

        beforeEach(() => {
            getDetailsFileName = sandbox.stub(utils, 'getDetailsFileName').returns('');
        });

        it('should be returned for test if they are available', () => {
            const testResult = mkTestResult_({
                err: {
                    details: {title: 'some-title', data: {foo: 'bar'}}
                }
            });
            getDetailsFileName.returns('md5-bro-n-time');

            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

            assert.deepEqual(hermioneTestAdapter.errorDetails, {
                title: 'some-title',
                data: {foo: 'bar'},
                filePath: `${ERROR_DETAILS_PATH}/md5-bro-n-time`
            });
        });

        it('should have "error details" title if no title is given', () => {
            const testResult = mkTestResult_({err: {details: {}}});

            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

            assert.propertyVal(hermioneTestAdapter.errorDetails, 'title', 'error details');
        });

        it('should be memoized', () => {
            const testResult = mkTestResult_({
                err: {
                    details: {title: 'some-title', data: {foo: 'bar'}}
                }
            });
            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

            const firstErrDetails = hermioneTestAdapter.errorDetails;
            const secondErrDetails = hermioneTestAdapter.errorDetails;

            assert.calledOnce(getDetailsFileName);
            assert.deepEqual(firstErrDetails, secondErrDetails);
        });

        it('should be returned as null if absent', () => {
            const testResult = mkTestResult_({err: {}});

            const {errorDetails} = mkHermioneTestResultAdapter(testResult);

            assert.isNull(errorDetails);
        });

        it('should use test id, browser-id and attempt for filepath composing', () => {
            const testResult = mkTestResult_({
                id: 'abcdef',
                browserId: 'bro',
                err: {
                    details: {data: {foo: 'bar'}}
                }
            });
            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

            // we need to get errorDetails to trigger getDetailsFileName to be called
            hermioneTestAdapter.errorDetails;

            assert.calledWith(getDetailsFileName, 'abcdef', 'bro', hermioneTestAdapter.attempt);
        });
    });

    describe('saveErrorDetails', () => {
        let fsWriteFile;

        beforeEach(() => {
            sandbox.stub(utils, 'makeDirFor').resolves();
            sandbox.stub(utils, 'getDetailsFileName').returns('md5-bro-n-time');

            fsWriteFile = sandbox.stub(fs, 'writeFile').resolves();
        });

        it('should do nothing if no error details are available', async () => {
            const hermioneTestAdapter = mkHermioneTestResultAdapter(mkTestResult_({err: {}}));

            await hermioneTestAdapter.saveErrorDetails();

            assert.notCalled(fsWriteFile);
        });

        it('should save error details to correct path', async () => {
            const testResult = mkTestResult_({err: {
                details: {title: 'some-title', data: {}}
            }});
            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);
            const {filePath} = hermioneTestAdapter.errorDetails;

            await hermioneTestAdapter.saveErrorDetails('report-path');

            assert.calledWithMatch(fsWriteFile, `report-path/${filePath}`, sinon.match.any);
        });

        it('should create directory for error details', async () => {
            const testResult = mkTestResult_({err: {details: {data: {}}}});
            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

            await hermioneTestAdapter.saveErrorDetails('report-path');

            assert.calledOnceWith(utils.makeDirFor, sinon.match(`report-path/${ERROR_DETAILS_PATH}`));
        });

        it('should save error details', async () => {
            const data = {foo: 'bar'};
            const testResult = mkTestResult_({err: {details: {data}}});
            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

            await hermioneTestAdapter.saveErrorDetails('');

            assert.calledWith(fsWriteFile, sinon.match.any, JSON.stringify(data, null, 2));
        });
    });

    describe('saveTestImages', () => {
        it('should build diff to tmp dir', async () => {
            tmp.tmpdir = 'tmp/dir';
            const testResult = mkTestResult_({
                id: () => '',
                assertViewResults: [err]
            });
            utils.getDiffPath.returns('diff/report/path');

            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult, {}, {});
            const workers = {saveDiffTo: sandbox.stub()};
            await hermioneTestAdapter.saveTestImages('', workers);

            assert.calledOnceWith(workers.saveDiffTo, err, sinon.match('tmp/dir/diff/report/path'));
        });

        it('should save diff in report from tmp dir using external storage', async () => {
            tmp.tmpdir = 'tmp/dir';
            const testResult = mkTestResult_({
                id: () => '',
                assertViewResults: [err]
            });
            utils.getDiffPath.returns('diff/report/path');
            const imagesSaver = {saveImg: sandbox.stub()};
            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult, {}, {imagesSaver});
            const workers = {saveDiffTo: sandbox.stub()};
            await hermioneTestAdapter.saveTestImages('html-report/path', workers);

            assert.calledWith(
                imagesSaver.saveImg,
                sinon.match('tmp/dir/diff/report/path'),
                {destPath: 'diff/report/path', reportDir: 'html-report/path'}
            );
        });
    });

    describe('hasDiff()', () => {
        it('should return true if test has image diff errors', () => {
            const testResult = mkTestResult_({assertViewResults: [new ImageDiffError()]});

            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult, {errors: {ImageDiffError}});

            assert.isTrue(hermioneTestAdapter.hasDiff());
        });

        it('should return false if test has not image diff errors', () => {
            const testResult = mkTestResult_({assertViewResults: [new Error()]});

            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult, {errors: {ImageDiffError}});

            assert.isFalse(hermioneTestAdapter.hasDiff());
        });
    });

    it('should return image dir', () => {
        const testResult = mkTestResult_({id: () => 'some-id'});

        const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

        assert.deepEqual(hermioneTestAdapter.imageDir, 'some-id');
    });

    it('should return description', () => {
        const testResult = mkTestResult_({description: 'some-description'});

        const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

        assert.deepEqual(hermioneTestAdapter.description, 'some-description');
    });

    [
        {field: 'refImg', method: 'getRefImg'},
        {field: 'currImg', method: 'getCurrImg'}
    ].forEach(({field, method}) => {
        describe(`${method}`, () => {
            it(`should return ${field} from test result`, () => {
                const testResult = mkTestResult_({assertViewResults: [
                    {[field]: 'some-value', stateName: 'plain'}
                ]});

                const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

                assert.equal(hermioneTestAdapter[method]('plain'), 'some-value');
            });
        });
    });

    describe('getErrImg', () => {
        it('should return error screenshot from test result', () => {
            const testResult = mkTestResult_({err: {screenshot: 'some-value'}});

            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

            assert.equal(hermioneTestAdapter.getErrImg(), 'some-value');
        });
    });

    describe('prepareTestResult()', () => {
        it('should return correct "name" field', () => {
            const testResult = mkTestResult_({
                root: true,
                title: 'some-title'
            });

            const result = mkHermioneTestResultAdapter(testResult).prepareTestResult();

            assert.propertyVal(result, 'name', 'some-title');
        });

        it('should return correct "suitePath" field', () => {
            const parentSuite = {parent: {root: true}, title: 'root-title'};
            const testResult = mkTestResult_({
                parent: parentSuite,
                title: 'some-title'
            });
            getSuitePath.returns(['root-title', 'some-title']);

            const result = mkHermioneTestResultAdapter(testResult).prepareTestResult();

            assert.deepEqual(result.suitePath, ['root-title', 'some-title']);
        });

        it('should return "browserId" field as is', () => {
            const testResult = mkTestResult_({
                root: true,
                browserId: 'bro'
            });

            const result = mkHermioneTestResultAdapter(testResult).prepareTestResult();

            assert.propertyVal(result, 'browserId', 'bro');
        });
    });

    describe('getImagesInfo()', () => {
        beforeEach(() => {
            sandbox.stub(utils, 'copyImageAsync');
            sandbox.stub(utils, 'getReferencePath').returns('some/ref.png');
        });

        it('should not reinit "imagesInfo"', () => {
            const testResult = mkTestResult_({imagesInfo: [1, 2]});

            mkHermioneTestResultAdapter(testResult).getImagesInfo();

            assert.deepEqual(testResult.imagesInfo, [1, 2]);
        });

        it('should reinit "imagesInfo" if it was empty', () => {
            const testResult = mkTestResult_({assertViewResults: [1], imagesInfo: []});

            mkHermioneTestResultAdapter(testResult).getImagesInfo();

            assert.lengthOf(testResult.imagesInfo, 1);
        });

        it('should return diffClusters', () => {
            const testResult = mkTestResult_({
                assertViewResults: [{diffClusters: [{left: 0, top: 0, right: 1, bottom: 1}]}],
                imagesInfo: []
            });

            const [{diffClusters}] = mkHermioneTestResultAdapter(testResult).getImagesInfo();

            assert.deepEqual(diffClusters, [{left: 0, top: 0, right: 1, bottom: 1}]);
        });

        it('should return saved images', async () => {
            const testResult = mkTestResult_({
                assertViewResults: [mkErrStub()],
                imagesInfo: []
            });

            const imagesSaver = {saveImg: sandbox.stub()};
            imagesSaver.saveImg.withArgs(
                'ref/path',
                {destPath: 'some/ref.png', reportDir: 'some/rep'}
            ).returns('saved/ref.png');
            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult, {}, {imagesSaver});
            const workers = {saveDiffTo: sandbox.stub()};

            await hermioneTestAdapter.saveTestImages('some/rep', workers);

            const {expectedImg} = hermioneTestAdapter.getImagesFor(SUCCESS);
            assert.equal(expectedImg.path, 'saved/ref.png');
        });

        it('should return dest image path by default', async () => {
            const testResult = mkTestResult_({
                assertViewResults: [mkErrStub()],
                imagesInfo: []
            });

            const imagesSaver = {saveImg: sandbox.stub()};
            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult, {}, {imagesSaver});
            const workers = {saveDiffTo: sandbox.stub()};

            await hermioneTestAdapter.saveTestImages('some/rep', workers);

            const {expectedImg} = hermioneTestAdapter.getImagesFor(SUCCESS);
            assert.equal(expectedImg.path, 'some/ref.png');
        });
    });

    describe('saveBase64Screenshot', () => {
        beforeEach(() => {
            sandbox.stub(utils.logger, 'warn');
            sandbox.stub(utils, 'makeDirFor').resolves();
            sandbox.stub(fs, 'writeFile').resolves();
            sandbox.stub(utils, 'copyImageAsync');
        });

        describe('if screenshot on reject does not exist', () => {
            it('should not save screenshot', () => {
                const testResult = mkTestResult_({
                    err: {screenshot: {base64: null}}
                });
                const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

                return hermioneTestAdapter.saveBase64Screenshot()
                    .then(() => assert.notCalled(fs.writeFile));
            });

            it('should warn about it', () => {
                const testResult = mkTestResult_({
                    err: {screenshot: {base64: null}}
                });
                const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

                return hermioneTestAdapter.saveBase64Screenshot()
                    .then(() => assert.calledWith(utils.logger.warn, 'Cannot save screenshot on reject'));
            });
        });

        it('should create directory for screenshot', () => {
            const testResult = mkTestResult_({
                err: {screenshot: {base64: 'base64-data'}}
            });
            utils.getCurrentPath.returns('dest/path');
            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

            return hermioneTestAdapter.saveBase64Screenshot()
                .then(() => assert.calledOnceWith(utils.makeDirFor, sinon.match('dest/path')));
        });

        it('should save screenshot from base64 format', async () => {
            const testResult = mkTestResult_({
                err: {screenshot: {base64: 'base64-data'}}
            });
            utils.getCurrentPath.returns('dest/path');
            const bufData = new Buffer('base64-data', 'base64');
            const imagesSaver = {saveImg: sandbox.stub()};
            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult, {}, {imagesSaver});

            await hermioneTestAdapter.saveBase64Screenshot('report/path');

            assert.calledOnceWith(fs.writeFile, sinon.match('dest/path'), bufData, 'base64');
            assert.calledWith(imagesSaver.saveImg, sinon.match('dest/path'), {destPath: 'dest/path', reportDir: 'report/path'});
        });
    });
});
