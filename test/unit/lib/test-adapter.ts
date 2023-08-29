import _ from 'lodash';
import * as fsOriginal from 'fs-extra';
import proxyquire from 'proxyquire';
import sinon from 'sinon';
import tmpOriginal from 'tmp';

import {SKIPPED, TestStatus} from 'lib/constants/test-statuses';
import {ERROR_DETAILS_PATH} from 'lib/constants/paths';
import {TestAdapter} from 'lib/test-adapter';
import {ErrorDetails, Suite, TestResult} from 'lib/types';
import {ImagesInfoFormatter} from 'lib/image-handler';
import * as originalUtils from 'lib/server-utils';
import {ErrorName} from 'lib/errors';

describe('hermione test adapter', () => {
    const sandbox = sinon.sandbox.create();

    let HermioneTestResultAdapter: typeof TestAdapter;
    let getCommandsHistory: sinon.SinonStub;
    let getSuitePath: sinon.SinonStub;
    let utils: sinon.SinonStubbedInstance<typeof originalUtils>;
    let fs: sinon.SinonStubbedInstance<typeof fsOriginal>;
    let tmp: typeof tmpOriginal;

    class ImageDiffError extends Error {
        name = ErrorName.IMAGE_DIFF;
    }

    const mkImagesInfoFormatter = (): sinon.SinonStubbedInstance<ImagesInfoFormatter> => {
        return {
            getRefImg: sinon.stub(),
            getCurrImg: sinon.stub(),
            getScreenshot: sinon.stub()
        } as sinon.SinonStubbedInstance<ImagesInfoFormatter>;
    };

    const mkHermioneTestResultAdapter = (
        testResult: TestResult,
        {status = TestStatus.SUCCESS, imagesInfoFormatter = mkImagesInfoFormatter()}: {status?: TestStatus, imagesInfoFormatter?: ImagesInfoFormatter} = {}
    ): TestAdapter => {
        return new HermioneTestResultAdapter(testResult, {status, imagesInfoFormatter});
    };

    const mkTestResult_ = (result: Partial<TestResult>): TestResult => _.defaults(result, {
        id: 'some-id',
        fullTitle: () => 'default-title'
    }) as TestResult;

    beforeEach(() => {
        tmp = {tmpdir: 'default/dir'} as typeof tmpOriginal;
        fs = sinon.stub(_.clone(fsOriginal));
        getSuitePath = sandbox.stub();
        getCommandsHistory = sandbox.stub();

        const originalUtils = proxyquire('lib/server-utils', {
            'fs-extra': fs
        });
        utils = _.clone(originalUtils);

        HermioneTestResultAdapter = proxyquire('lib/test-adapter', {
            tmp,
            'fs-extra': fs,
            './plugin-utils': {getSuitePath},
            './history-utils': {getCommandsHistory},
            './server-utils': utils
        }).TestAdapter;
        sandbox.stub(utils, 'getCurrentPath').returns('');
        sandbox.stub(utils, 'getDiffPath').returns('');
        sandbox.stub(utils, 'getReferencePath').returns('');

        fs.readFile.resolves(Buffer.from(''));
        fs.writeFile.resolves();
        fs.copy.resolves();
    });

    afterEach(() => sandbox.restore());

    it('should return suite attempt', () => {
        const firstTestResult = mkTestResult_({fullTitle: () => 'some-title'});
        const secondTestResult = mkTestResult_({fullTitle: () => 'other-title'});

        mkHermioneTestResultAdapter(firstTestResult);

        assert.equal(mkHermioneTestResultAdapter(firstTestResult).attempt, 1);
        assert.equal(mkHermioneTestResultAdapter(secondTestResult).attempt, 0);
    });

    it('should not increment attempt for skipped tests', () => {
        const testResult = mkTestResult_({fullTitle: () => 'some-title'});

        mkHermioneTestResultAdapter(testResult, {status: SKIPPED});
        const result = mkHermioneTestResultAdapter(testResult, {status: SKIPPED});

        assert.equal(result.attempt, 0);
    });

    it('should return test error with "message", "stack" and "stateName"', () => {
        getCommandsHistory.withArgs([{name: 'foo'}], ['foo']).returns(['some-history']);
        const testResult = mkTestResult_({
            file: 'bar',
            history: [{name: 'foo'}],
            err: {
                message: 'some-message',
                stack: 'some-stack',
                stateName: 'some-test',
                foo: 'bar'
            } as any
        });

        const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

        assert.deepEqual(hermioneTestAdapter.error, {
            message: 'some-message',
            stack: 'some-stack',
            stateName: 'some-test'
        });
    });

    it('should return test history', () => {
        getCommandsHistory.withArgs([{name: 'foo'}]).returns(['some-history']);
        const testResult = mkTestResult_({
            file: 'bar',
            history: [{name: 'foo'}],
            err: {
                message: 'some-message',
                stack: 'some-stack',
                stateName: 'some-test',
                foo: 'bar'
            } as any
        });

        const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

        assert.deepEqual(hermioneTestAdapter.history, ['some-history']);
    });

    it('should return test state', () => {
        const testResult = mkTestResult_({title: 'some-test'});

        const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

        assert.deepEqual(hermioneTestAdapter.state, {name: 'some-test'});
    });

    it('should return assert view results', () => {
        const testResult = mkTestResult_({assertViewResults: [1 as any]});

        const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

        assert.deepEqual(hermioneTestAdapter.assertViewResults, [1 as any]);
    });

    describe('error details', () => {
        let getDetailsFileName: sinon.SinonStub;

        beforeEach(() => {
            getDetailsFileName = sandbox.stub(utils, 'getDetailsFileName').returns('');
        });

        it('should be returned for test if they are available', () => {
            const testResult = mkTestResult_({
                err: {
                    details: {title: 'some-title', data: {foo: 'bar'}}
                } as any
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
            const testResult = mkTestResult_({err: {details: {}} as any});

            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

            assert.propertyVal(hermioneTestAdapter.errorDetails, 'title', 'error details');
        });

        it('should be memoized', () => {
            const testResult = mkTestResult_({
                err: {
                    details: {title: 'some-title', data: {foo: 'bar'}}
                } as any
            });
            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

            const firstErrDetails = hermioneTestAdapter.errorDetails;
            const secondErrDetails = hermioneTestAdapter.errorDetails;

            assert.calledOnce(getDetailsFileName);
            assert.deepEqual(firstErrDetails, secondErrDetails);
        });

        it('should be returned as null if absent', () => {
            const testResult = mkTestResult_({err: {}} as any);

            const {errorDetails} = mkHermioneTestResultAdapter(testResult);

            assert.isNull(errorDetails);
        });

        it('should use test id, browser-id and attempt for filepath composing', () => {
            const testResult = mkTestResult_({
                id: 'abcdef',
                browserId: 'bro',
                err: {
                    details: {data: {foo: 'bar'}}
                } as any
            });
            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

            // we need to get errorDetails to trigger getDetailsFileName to be called
            hermioneTestAdapter.errorDetails;

            assert.calledWith(getDetailsFileName, 'abcdef', 'bro', hermioneTestAdapter.attempt);
        });
    });

    describe('saveErrorDetails', () => {
        beforeEach(() => {
            sandbox.stub(utils, 'makeDirFor').resolves();
            sandbox.stub(utils, 'getDetailsFileName').returns('md5-bro-n-time');
        });

        it('should do nothing if no error details are available', async () => {
            const hermioneTestAdapter = mkHermioneTestResultAdapter(mkTestResult_({err: {} as any}));

            await hermioneTestAdapter.saveErrorDetails('');

            assert.notCalled(fs.writeFile);
        });

        it('should save error details to correct path', async () => {
            const testResult = mkTestResult_({err: {
                details: {title: 'some-title', data: {}}
            } as any});
            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);
            const {filePath} = hermioneTestAdapter.errorDetails as ErrorDetails;

            await hermioneTestAdapter.saveErrorDetails('report-path');

            assert.calledWithMatch(fs.writeFile, `report-path/${filePath}`, sinon.match.any);
        });

        it('should create directory for error details', async () => {
            const testResult = mkTestResult_({err: {details: {data: {}}} as any});
            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

            await hermioneTestAdapter.saveErrorDetails('report-path');

            assert.calledOnceWith(utils.makeDirFor, sinon.match(`report-path/${ERROR_DETAILS_PATH}`));
        });

        it('should save error details', async () => {
            const data = {foo: 'bar'};
            const testResult = mkTestResult_({err: {details: {data}} as any});
            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

            await hermioneTestAdapter.saveErrorDetails('');

            assert.calledWith(fs.writeFile, sinon.match.any, JSON.stringify(data, null, 2));
        });
    });

    describe('hasDiff', () => {
        it('should return true if test has image diff errors', () => {
            const testResult = mkTestResult_({assertViewResults: [new ImageDiffError() as any]});

            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

            assert.isTrue(hermioneTestAdapter.hasDiff());
        });

        it('should return false if test has not image diff errors', () => {
            const testResult = mkTestResult_({assertViewResults: [new Error() as any]});

            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

            assert.isFalse(hermioneTestAdapter.hasDiff());
        });
    });

    it('should return image dir', () => {
        const testResult = mkTestResult_({id: 'some-id'});

        const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

        assert.deepEqual(hermioneTestAdapter.imageDir, 'some-id');
    });

    it('should return description', () => {
        const testResult = mkTestResult_({description: 'some-description'});

        const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

        assert.deepEqual(hermioneTestAdapter.description, 'some-description');
    });

    ([
        {field: 'refImg', method: 'getRefImg'},
        {field: 'currImg', method: 'getCurrImg'}
    ] as const).forEach(({field, method}) => {
        describe(`${method}`, () => {
            it(`should use imagesInfoFormatter to get ${field} from test result`, () => {
                const testResult = mkTestResult_({assertViewResults: [
                    {[field]: 'some-value', stateName: 'plain'} as any
                ]});
                const imagesInfoFormatter = mkImagesInfoFormatter();
                const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult, {imagesInfoFormatter});

                hermioneTestAdapter[method]('plain');

                assert.calledOnceWith(imagesInfoFormatter[method], testResult.assertViewResults, 'plain');
            });
        });
    });

    describe('getErrImg', () => {
        it('should return error screenshot from test result', () => {
            const testResult = mkTestResult_({err: {screenshot: 'some-value'} as any});

            const imagesInfoFormatter = mkImagesInfoFormatter();
            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult, {imagesInfoFormatter});

            hermioneTestAdapter.getErrImg();

            assert.calledOnceWith(imagesInfoFormatter.getScreenshot, testResult);
        });
    });

    describe('prepareTestResult', () => {
        it('should return correct "name" field', () => {
            const testResult = mkTestResult_({
                title: 'some-title'
            });

            const result = mkHermioneTestResultAdapter(testResult).prepareTestResult();

            assert.propertyVal(result, 'name', 'some-title');
        });

        it('should return correct "suitePath" field', () => {
            const parentSuite = {parent: {root: true}, title: 'root-title'} as Suite;
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
                browserId: 'bro'
            });

            const result = mkHermioneTestResultAdapter(testResult).prepareTestResult();

            assert.propertyVal(result, 'browserId', 'bro');
        });
    });

    describe('timestamp', () => {
        it('should return corresponding timestamp of the test result', () => {
            const testResult = mkTestResult_({
                timestamp: 100500
            });
            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

            assert.strictEqual(hermioneTestAdapter.timestamp, 100500);
        });
    });
});
