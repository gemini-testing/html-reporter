import _ from 'lodash';
import * as fsOriginal from 'fs-extra';
import proxyquire from 'proxyquire';
import sinon from 'sinon';
import tmpOriginal from 'tmp';

import {TestStatus} from 'lib/constants/test-statuses';
import {ERROR_DETAILS_PATH} from 'lib/constants/paths';
import {ReporterTestResult} from 'lib/test-adapter';
import {TestplaneTestAdapter, TestplaneTestAdapterOptions} from 'lib/test-adapter/testplane';
import {TestplaneTestResult} from 'lib/types';
import * as originalUtils from 'lib/server-utils';
import * as originalCommonUtils from 'lib/common-utils';
import * as originalTestAdapterUtils from 'lib/test-adapter/utils';

describe('TestplaneTestAdapter', () => {
    const sandbox = sinon.sandbox.create();

    let TestplaneTestAdapter: new (testResult: TestplaneTestResult, options: TestplaneTestAdapterOptions) => ReporterTestResult;
    let getCommandsHistory: sinon.SinonStub;
    let getSuitePath: sinon.SinonStub;
    let utils: sinon.SinonStubbedInstance<typeof originalUtils>;
    let commonUtils: sinon.SinonStubbedInstance<typeof originalCommonUtils>;
    let fs: sinon.SinonStubbedInstance<typeof fsOriginal>;
    let tmp: typeof tmpOriginal;
    let testAdapterUtils: sinon.SinonStubbedInstance<typeof originalTestAdapterUtils>;

    const mkTestplaneTestResultAdapter = (
        testResult: TestplaneTestResult,
        {status = TestStatus.SUCCESS}: {status?: TestStatus} = {}
    ): TestplaneTestAdapter => {
        return new TestplaneTestAdapter(testResult, {status, attempt: 0}) as TestplaneTestAdapter;
    };

    const mkTestResult_ = (result: Partial<TestplaneTestResult>): TestplaneTestResult => _.defaults(result, {
        id: 'some-id',
        fullTitle: () => 'default-title'
    }) as TestplaneTestResult;

    beforeEach(() => {
        tmp = {tmpdir: 'default/dir'} as typeof tmpOriginal;
        fs = sinon.stub(_.clone(fsOriginal));
        getSuitePath = sandbox.stub();
        getCommandsHistory = sandbox.stub();

        const originalUtils = proxyquire('lib/server-utils', {
            'fs-extra': fs
        });
        utils = _.clone(originalUtils);

        const originalCommonUtils = proxyquire('lib/common-utils', {});
        commonUtils = _.clone(originalCommonUtils);

        const originalTestAdapterUtils = proxyquire('lib/test-adapter/utils', {
            '../../server-utils': utils,
            '../../common-utils': commonUtils
        });
        testAdapterUtils = _.clone(originalTestAdapterUtils);

        TestplaneTestAdapter = proxyquire('lib/test-adapter/testplane', {
            tmp,
            'fs-extra': fs,
            '../plugin-utils': {getSuitePath},
            '../history-utils': {getCommandsHistory},
            '../server-utils': utils,
            './utils': testAdapterUtils
        }).TestplaneTestAdapter;
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

        const testplaneTestAdapter = mkTestplaneTestResultAdapter(testResult);

        assert.deepEqual(testplaneTestAdapter.error, {
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

        const testplaneTestAdapter = mkTestplaneTestResultAdapter(testResult);

        assert.deepEqual(testplaneTestAdapter.history, ['some-history']);
    });

    it('should return test state', () => {
        const testResult = mkTestResult_({title: 'some-test'});

        const testplaneTestAdapter = mkTestplaneTestResultAdapter(testResult);

        assert.deepEqual(testplaneTestAdapter.state, {name: 'some-test'});
    });

    describe('error details', () => {
        let getDetailsFileName: sinon.SinonStub;

        beforeEach(() => {
            getDetailsFileName = sandbox.stub(commonUtils, 'getDetailsFileName').returns('');
        });

        it('should be returned for test if they are available', () => {
            const testResult = mkTestResult_({
                err: {
                    details: {title: 'some-title', data: {foo: 'bar'}}
                } as any
            });
            getDetailsFileName.returns('md5-bro-n-time');

            const testplaneTestAdapter = mkTestplaneTestResultAdapter(testResult);

            assert.deepEqual(testplaneTestAdapter.errorDetails, {
                title: 'some-title',
                data: {foo: 'bar'},
                filePath: `${ERROR_DETAILS_PATH}/md5-bro-n-time`
            });
        });

        it('should have "error details" title if no title is given', () => {
            const testResult = mkTestResult_({err: {details: {}} as any});

            const testplaneTestAdapter = mkTestplaneTestResultAdapter(testResult);

            assert.propertyVal(testplaneTestAdapter.errorDetails, 'title', 'error details');
        });

        it('should be memoized', () => {
            const extractErrorDetails = sandbox.stub(testAdapterUtils, 'extractErrorDetails').returns({});
            const testResult = mkTestResult_({
                err: {
                    details: {title: 'some-title', data: {foo: 'bar'}}
                } as any
            });
            const testplaneTestAdapter = mkTestplaneTestResultAdapter(testResult);

            const firstErrDetails = testplaneTestAdapter.errorDetails;
            const secondErrDetails = testplaneTestAdapter.errorDetails;

            assert.calledOnce(extractErrorDetails);
            assert.deepEqual(firstErrDetails, secondErrDetails);
        });

        it('should be returned as null if absent', () => {
            const testResult = mkTestResult_({err: {}} as any);

            const {errorDetails} = mkTestplaneTestResultAdapter(testResult);

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
            const testplaneTestAdapter = mkTestplaneTestResultAdapter(testResult);

            // we need to get errorDetails to trigger getDetailsFileName to be called
            testplaneTestAdapter.errorDetails;

            assert.calledWith(getDetailsFileName, 'abcdef', 'bro', testplaneTestAdapter.attempt);
        });
    });

    it('should return image dir', () => {
        const testResult = mkTestResult_({id: 'some-id'});

        const testplaneTestAdapter = mkTestplaneTestResultAdapter(testResult);

        assert.deepEqual(testplaneTestAdapter.imageDir, 'some-id');
    });

    it('should return description', () => {
        const testResult = mkTestResult_({description: 'some-description'});

        const testplaneTestAdapter = mkTestplaneTestResultAdapter(testResult);

        assert.deepEqual(testplaneTestAdapter.description, 'some-description');
    });

    describe('timestamp', () => {
        it('should return corresponding timestamp of the test result', () => {
            const testResult = mkTestResult_({
                timestamp: 100500
            });
            const testplaneTestAdapter = mkTestplaneTestResultAdapter(testResult);

            assert.strictEqual(testplaneTestAdapter.timestamp, 100500);
        });
    });

    describe('imagesInfo', () => {
        it('should correctly format diff assert view result', () => {
            const testResult = mkTestResult_({
                timestamp: 100500,
                assertViewResults: [{
                    currImg: {path: 'curr-path', size: {width: 20, height: 10}},
                    diffClusters: [],
                    diffOpts: {diffColor: '#000'} as any,
                    message: 'diff message',
                    name: 'ImageDiffError',
                    refImg: {path: 'ref-path', size: {width: 25, height: 15}},
                    stack: 'some-stack',
                    stateName: 'some-state',
                    differentPixels: 100,
                    diffRatio: 0.01
                }]
            });

            const testplaneTestAdapter = mkTestplaneTestResultAdapter(testResult);

            assert.deepEqual(testplaneTestAdapter.imagesInfo, [
                {
                    status: TestStatus.FAIL,
                    stateName: 'some-state',
                    actualImg: {path: 'curr-path', size: {height: 10, width: 20}},
                    expectedImg: {path: 'ref-path', size: {height: 15, width: 25}},
                    refImg: {path: 'ref-path', size: {height: 15, width: 25}},
                    diffClusters: [],
                    diffOptions: {diffColor: '#000'} as any,
                    differentPixels: 100,
                    diffRatio: 0.01
                }
            ]);
        });

        it('should correctly format no ref assert view result', () => {
            const testResult = mkTestResult_({
                timestamp: 100500,
                assertViewResults: [{
                    currImg: {path: 'curr-path', size: {height: 10, width: 20}},
                    message: 'no ref message',
                    name: 'NoRefImageError',
                    refImg: {path: 'ref-path', size: {height: 15, width: 25}},
                    stack: 'some-stack',
                    stateName: 'some-state'
                }]
            });

            const testplaneTestAdapter = mkTestplaneTestResultAdapter(testResult);

            assert.deepEqual(testplaneTestAdapter.imagesInfo, [
                {
                    status: TestStatus.ERROR,
                    stateName: 'some-state',
                    error: {
                        name: 'NoRefImageError',
                        message: 'no ref message',
                        stack: 'some-stack'
                    },
                    actualImg: {path: 'curr-path', size: {height: 10, width: 20}},
                    refImg: {path: 'ref-path', size: {height: 15, width: 25}}
                }
            ]);
        });

        it('should correctly format updated assert view result', () => {
            const testResult = mkTestResult_({
                timestamp: 100500,
                assertViewResults: [{
                    isUpdated: true,
                    stateName: 'some-state',
                    currImg: {path: 'curr-path', size: {height: 10, width: 20}},
                    refImg: {path: 'ref-path', size: {height: 15, width: 25}}
                } as TestplaneTestResult['assertViewResults'][number]]
            });

            const testplaneTestAdapter = mkTestplaneTestResultAdapter(testResult);

            assert.deepEqual(testplaneTestAdapter.imagesInfo, [
                {
                    status: TestStatus.UPDATED,
                    stateName: 'some-state',
                    actualImg: {path: 'curr-path', size: {height: 10, width: 20}},
                    expectedImg: {path: 'ref-path', size: {height: 15, width: 25}},
                    refImg: {path: 'ref-path', size: {height: 15, width: 25}}
                }
            ]);
        });

        it('should correctly format success assert view result', () => {
            const testResult = mkTestResult_({
                timestamp: 100500,
                assertViewResults: [{
                    stateName: 'some-state',
                    refImg: {path: 'ref-path', size: {height: 15, width: 25}}
                }]
            });

            const testplaneTestAdapter = mkTestplaneTestResultAdapter(testResult);

            assert.deepEqual(testplaneTestAdapter.imagesInfo, [
                {
                    status: TestStatus.SUCCESS,
                    stateName: 'some-state',
                    expectedImg: {path: 'ref-path', size: {height: 15, width: 25}},
                    refImg: {path: 'ref-path', size: {height: 15, width: 25}}
                }
            ]);
        });
    });
});
