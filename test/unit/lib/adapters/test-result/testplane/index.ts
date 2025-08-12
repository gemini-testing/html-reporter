import _ from 'lodash';
import * as fsOriginal from 'fs-extra';
import proxyquire from 'proxyquire';
import sinon from 'sinon';
import tmpOriginal from 'tmp';

import {TestStatus} from 'lib/constants/test-statuses';
import {ERROR_DETAILS_PATH} from 'lib/constants/paths';
import {TestplaneTestResultAdapter, TestplaneTestResultAdapterOptions, getStatus} from 'lib/adapters/test-result/testplane';
import {ImageFile, TestplaneTestResult, TestStepKey} from 'lib/types';
import * as originalUtils from 'lib/server-utils';
import * as originalCommonUtils from 'lib/common-utils';
import * as originalTestAdapterUtils from 'lib/adapters/test-result/utils';

import type Testplane from 'testplane';
import type {ReporterTestResult} from 'lib/adapters/test-result';
import {mkTestStepCompressed} from '../../../../utils';

describe('getStatus', () => {
    it('should be "error" if test has both: runtime errors and assertview fails', () => {
        const status = getStatus(
            'failTest',
            {TEST_FAIL: 'failTest'} as Testplane['events'],
            {
                assertViewResults: [{}, {}],
                err: {name: 'foo', message: 'bar'}
            } as TestplaneTestResult
        );

        assert.equal(status, TestStatus.ERROR);
    });
});

describe('TestplaneTestResultAdapter', () => {
    const sandbox = sinon.sandbox.create();

    let TestplaneTestResultAdapter: new (testResult: TestplaneTestResult, options: TestplaneTestResultAdapterOptions) => ReporterTestResult;
    let getSuitePath: sinon.SinonStub;
    let utils: sinon.SinonStubbedInstance<typeof originalUtils>;
    let commonUtils: sinon.SinonStubbedInstance<typeof originalCommonUtils>;
    let fs: sinon.SinonStubbedInstance<typeof fsOriginal>;
    let tmp: typeof tmpOriginal;
    let testAdapterUtils: sinon.SinonStubbedInstance<typeof originalTestAdapterUtils>;

    const mkTestplaneTestResultAdapter = (
        testResult: TestplaneTestResult,
        {status = TestStatus.SUCCESS}: {status?: TestStatus} = {}
    ): TestplaneTestResultAdapter => {
        return new TestplaneTestResultAdapter(testResult, {status, attempt: 0, duration: 0}) as TestplaneTestResultAdapter;
    };

    const mkTestResult_ = (result: Partial<TestplaneTestResult>): TestplaneTestResult => _.defaults(result, {
        id: 'some-id',
        fullTitle: () => 'default-title'
    }) as TestplaneTestResult;

    beforeEach(() => {
        tmp = {tmpdir: 'default/dir'} as typeof tmpOriginal;
        fs = sinon.stub(_.clone(fsOriginal));
        getSuitePath = sandbox.stub();

        const originalUtils = proxyquire('lib/server-utils', {
            'fs-extra': fs
        });
        utils = _.clone(originalUtils);

        const originalCommonUtils = proxyquire('lib/common-utils', {});
        commonUtils = _.clone(originalCommonUtils);

        const originalTestAdapterUtils = proxyquire('lib/adapters/test-result/utils', {
            '../../../common-utils': commonUtils
        });
        testAdapterUtils = _.clone(originalTestAdapterUtils);

        TestplaneTestResultAdapter = proxyquire('lib/adapters/test-result/testplane', {
            tmp,
            'fs-extra': fs,
            '../../../plugin-utils': {getSuitePath},
            '../../server-utils': utils,
            '../utils': testAdapterUtils
        }).TestplaneTestResultAdapter;
        sandbox.stub(utils, 'getCurrentPath').returns('');
        sandbox.stub(utils, 'getDiffPath').returns('');
        sandbox.stub(utils, 'getReferencePath').returns('');

        fs.readFile.resolves(Buffer.from(''));
        fs.writeFile.resolves();
        fs.copy.resolves();
    });

    afterEach(() => sandbox.restore());

    it('should return full test error', () => {
        const testResult = mkTestResult_({
            file: 'bar',
            history: [],
            err: {
                message: 'some-message',
                stack: 'some-stack',
                stateName: 'some-test',
                foo: 'bar'
            } as any
        });

        const TestplaneTestResultAdapter = mkTestplaneTestResultAdapter(testResult);

        assert.deepEqual(TestplaneTestResultAdapter.error, {
            message: 'some-message',
            stack: 'some-stack',
            stateName: 'some-test',
            foo: 'bar'
        } as any);
    });

    it('should return test history', () => {
        const testResult = mkTestResult_({
            file: 'bar',
            history: [mkTestStepCompressed({[TestStepKey.Name]: 'some-name', [TestStepKey.TimeStart]: 1000})],
            err: {
                message: 'some-message',
                stack: 'some-stack',
                stateName: 'some-test',
                foo: 'bar'
            } as any
        });

        const TestplaneTestResultAdapter = mkTestplaneTestResultAdapter(testResult);

        assert.deepEqual(TestplaneTestResultAdapter.history, [mkTestStepCompressed({[TestStepKey.Name]: 'some-name', [TestStepKey.TimeStart]: 1000})]);
    });

    it('should return test state', () => {
        const testResult = mkTestResult_({title: 'some-test'});

        const TestplaneTestResultAdapter = mkTestplaneTestResultAdapter(testResult);

        assert.deepEqual(TestplaneTestResultAdapter.state, {name: 'some-test'});
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

            const TestplaneTestResultAdapter = mkTestplaneTestResultAdapter(testResult);

            assert.deepEqual(TestplaneTestResultAdapter.errorDetails, {
                title: 'some-title',
                data: {foo: 'bar'},
                filePath: `${ERROR_DETAILS_PATH}/md5-bro-n-time`
            });
        });

        it('should have "error details" title if no title is given', () => {
            const testResult = mkTestResult_({err: {details: {}} as any});

            const TestplaneTestResultAdapter = mkTestplaneTestResultAdapter(testResult);

            assert.propertyVal(TestplaneTestResultAdapter.errorDetails, 'title', 'error details');
        });

        it('should be memoized', () => {
            const extractErrorDetails = sandbox.stub(testAdapterUtils, 'extractErrorDetails').returns({});
            const testResult = mkTestResult_({
                err: {
                    details: {title: 'some-title', data: {foo: 'bar'}}
                } as any
            });
            const TestplaneTestResultAdapter = mkTestplaneTestResultAdapter(testResult);

            const firstErrDetails = TestplaneTestResultAdapter.errorDetails;
            const secondErrDetails = TestplaneTestResultAdapter.errorDetails;

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
            const TestplaneTestResultAdapter = mkTestplaneTestResultAdapter(testResult);

            // we need to get errorDetails to trigger getDetailsFileName to be called
            TestplaneTestResultAdapter.errorDetails;

            assert.calledWith(getDetailsFileName, 'abcdef', 'bro', TestplaneTestResultAdapter.attempt);
        });
    });

    it('should return image dir', () => {
        const testResult = mkTestResult_({id: 'some-id'});

        const TestplaneTestResultAdapter = mkTestplaneTestResultAdapter(testResult);

        assert.deepEqual(TestplaneTestResultAdapter.imageDir, 'some-id');
    });

    it('should return description', () => {
        const testResult = mkTestResult_({description: 'some-description'});

        const TestplaneTestResultAdapter = mkTestplaneTestResultAdapter(testResult);

        assert.deepEqual(TestplaneTestResultAdapter.description, 'some-description');
    });

    describe('timestamp', () => {
        it('should return corresponding timestamp of the test result', () => {
            const testResult = mkTestResult_({
                timestamp: 100500
            });
            const TestplaneTestResultAdapter = mkTestplaneTestResultAdapter(testResult);

            assert.strictEqual(TestplaneTestResultAdapter.timestamp, 100500);
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
                    refImg: {path: 'ref-path', size: {width: 25, height: 15}, relativePath: 'some-path'},
                    stack: 'some-stack',
                    stateName: 'some-state',
                    differentPixels: 100,
                    diffRatio: 0.01
                }]
            });

            const TestplaneTestResultAdapter = mkTestplaneTestResultAdapter(testResult);

            assert.deepEqual(TestplaneTestResultAdapter.imagesInfo, [
                {
                    status: TestStatus.FAIL,
                    stateName: 'some-state',
                    actualImg: {path: 'curr-path', size: {height: 10, width: 20}},
                    expectedImg: {path: 'ref-path', size: {height: 15, width: 25}, relativePath: 'some-path'} as ImageFile,
                    refImg: {path: 'ref-path', size: {height: 15, width: 25}, relativePath: 'some-path'},
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
                    refImg: {path: 'ref-path', size: {height: 15, width: 25}, relativePath: 'some-path'},
                    stack: 'some-stack',
                    stateName: 'some-state'
                }]
            });

            const TestplaneTestResultAdapter = mkTestplaneTestResultAdapter(testResult);

            assert.deepEqual(TestplaneTestResultAdapter.imagesInfo, [
                {
                    status: TestStatus.ERROR,
                    stateName: 'some-state',
                    error: {
                        name: 'NoRefImageError',
                        message: 'no ref message',
                        stack: 'some-stack'
                    },
                    actualImg: {path: 'curr-path', size: {height: 10, width: 20}},
                    refImg: {path: 'ref-path', size: {height: 15, width: 25}, relativePath: 'some-path'}
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
                } as unknown as TestplaneTestResult['assertViewResults'][number]]
            });

            const TestplaneTestResultAdapter = mkTestplaneTestResultAdapter(testResult);

            assert.deepEqual(TestplaneTestResultAdapter.imagesInfo, [
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
                    refImg: {path: 'ref-path', size: {height: 15, width: 25}, relativePath: 'some-path'}
                }]
            });

            const TestplaneTestResultAdapter = mkTestplaneTestResultAdapter(testResult);

            assert.deepEqual(TestplaneTestResultAdapter.imagesInfo, [
                {
                    status: TestStatus.SUCCESS,
                    stateName: 'some-state',
                    expectedImg: {path: 'ref-path', size: {height: 15, width: 25}, relativePath: 'some-path'} as ImageFile,
                    refImg: {path: 'ref-path', size: {height: 15, width: 25}, relativePath: 'some-path'}
                }
            ]);
        });
    });
});
