import _ from 'lodash';
import * as fsOriginal from 'fs-extra';
import proxyquire from 'proxyquire';
import sinon from 'sinon';
import tmpOriginal from 'tmp';

import {TestStatus} from 'lib/constants/test-statuses';
import {ERROR_DETAILS_PATH} from 'lib/constants/paths';
import {HermioneTestAdapter, HermioneTestAdapterOptions, ReporterTestResult} from 'lib/test-adapter';
import {HermioneTestResult} from 'lib/types';
import {ImagesInfoFormatter} from 'lib/image-handler';
import * as originalUtils from 'lib/server-utils';
import * as originalTestAdapterUtils from 'lib/test-adapter/utils';

describe('HermioneTestAdapter', () => {
    const sandbox = sinon.sandbox.create();

    let HermioneTestAdapter: new (testResult: HermioneTestResult, options: HermioneTestAdapterOptions) => ReporterTestResult;
    let getCommandsHistory: sinon.SinonStub;
    let getSuitePath: sinon.SinonStub;
    let utils: sinon.SinonStubbedInstance<typeof originalUtils>;
    let fs: sinon.SinonStubbedInstance<typeof fsOriginal>;
    let tmp: typeof tmpOriginal;
    let hermioneCache: typeof import('lib/test-adapter/cache/hermione');
    let testAdapterUtils: sinon.SinonStubbedInstance<typeof originalTestAdapterUtils>;

    const mkImagesInfoFormatter = (): sinon.SinonStubbedInstance<ImagesInfoFormatter> => {
        return {} as sinon.SinonStubbedInstance<ImagesInfoFormatter>;
    };

    const mkHermioneTestResultAdapter = (
        testResult: HermioneTestResult,
        {status = TestStatus.SUCCESS, imagesInfoFormatter = mkImagesInfoFormatter()}: {status?: TestStatus, imagesInfoFormatter?: ImagesInfoFormatter} = {}
    ): HermioneTestAdapter => {
        return new HermioneTestAdapter(testResult, {status, imagesInfoFormatter, attempt: 0}) as HermioneTestAdapter;
    };

    const mkTestResult_ = (result: Partial<HermioneTestResult>): HermioneTestResult => _.defaults(result, {
        id: 'some-id',
        fullTitle: () => 'default-title'
    }) as HermioneTestResult;

    beforeEach(() => {
        tmp = {tmpdir: 'default/dir'} as typeof tmpOriginal;
        fs = sinon.stub(_.clone(fsOriginal));
        hermioneCache = {testsAttempts: new Map()};
        getSuitePath = sandbox.stub();
        getCommandsHistory = sandbox.stub();

        const originalUtils = proxyquire('lib/server-utils', {
            'fs-extra': fs
        });
        utils = _.clone(originalUtils);

        const originalTestAdapterUtils = proxyquire('lib/test-adapter/utils', {
            '../../server-utils': utils
        });
        testAdapterUtils = _.clone(originalTestAdapterUtils);

        HermioneTestAdapter = proxyquire('lib/test-adapter/hermione', {
            tmp,
            'fs-extra': fs,
            '../plugin-utils': {getSuitePath},
            '../history-utils': {getCommandsHistory},
            '../server-utils': utils,
            './cache/hermione': hermioneCache,
            './utils': testAdapterUtils
        }).HermioneTestAdapter;
        sandbox.stub(utils, 'getCurrentPath').returns('');
        sandbox.stub(utils, 'getDiffPath').returns('');
        sandbox.stub(utils, 'getReferencePath').returns('');

        fs.readFile.resolves(Buffer.from(''));
        fs.writeFile.resolves();
        fs.copy.resolves();
    });

    afterEach(() => sandbox.restore());

    it('should return full test error', () => {
        getCommandsHistory.withArgs([{name: 'foo'}], ['foo']).returns(['some-history']);
        const testResult = mkTestResult_({
            file: 'bar',
            history: [{name: 'foo'}] as any,
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
            stateName: 'some-test',
            foo: 'bar'
        } as any);
    });

    it('should return test history', () => {
        getCommandsHistory.withArgs([{name: 'foo'}]).returns(['some-history']);
        const testResult = mkTestResult_({
            file: 'bar',
            history: [{name: 'foo'}] as any,
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
            const extractErrorDetails = sandbox.stub(testAdapterUtils, 'extractErrorDetails').returns({});
            const testResult = mkTestResult_({
                err: {
                    details: {title: 'some-title', data: {foo: 'bar'}}
                } as any
            });
            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

            const firstErrDetails = hermioneTestAdapter.errorDetails;
            const secondErrDetails = hermioneTestAdapter.errorDetails;

            assert.calledOnce(extractErrorDetails);
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
