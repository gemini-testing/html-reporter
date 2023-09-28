import sinon from 'sinon';
import _ from 'lodash';
import proxyquire from 'proxyquire';
import {TestCase, TestResult} from '@playwright/test/reporter';
import {ImageTitleEnding, PlaywrightAttachment, PlaywrightTestAdapterOptions, PwtTestStatus} from 'lib/test-adapter/playwright';
import {ErrorName, ImageDiffError, NoRefImageError} from 'lib/errors';
import {TestStatus} from 'lib/constants';

describe('PlaywrightTestAdapter', () => {
    let sandbox: sinon.SinonSandbox;
    let PlaywrightTestAdapter: typeof import('lib/test-adapter/playwright').PlaywrightTestAdapter;
    let imageSizeStub: sinon.SinonStub;
    let playwrightCache: typeof import('lib/test-adapter/cache/playwright');

    const createAttachment = (path: string): PlaywrightAttachment => ({
        contentType: 'image/png',
        name: path,
        path,
        body: Buffer.from('dummy-data')
    });

    const mkTestCase = (overrides: Partial<TestCase> = {}): TestCase => _.defaults(overrides, {
        parent: {project: sinon.stub().returns({name: 'some-browser'})},
        titlePath: sinon.stub().returns(['root', 'suite', 'subsuite', 'describe', 'test']),
        annotations: [],
        location: {file: 'test-file-path', column: 0, line: 0}
    } as any);
    const mkTestResult = (overrides: Partial<TestResult> = {}): TestResult => _.defaults(overrides, {
        status: 'failed',
        attachments: [
            createAttachment('state1' + ImageTitleEnding.Expected),
            createAttachment('state1' + ImageTitleEnding.Diff),
            createAttachment('state1' + ImageTitleEnding.Actual)
        ],
        errors: [{name: ErrorName.IMAGE_DIFF, message: 'Screenshot comparison failed', stack: ''}],
        steps: []
    } as any);

    const mkAdapterOptions = (overrides: Partial<PlaywrightTestAdapterOptions> = {}): PlaywrightTestAdapterOptions => _.defaults(overrides, {
        imagesInfoFormatter: sinon.stub()
    } as any);

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        playwrightCache = {testsAttempts: new Map()};

        imageSizeStub = sinon.stub().returns({height: 100, width: 200});

        PlaywrightTestAdapter = proxyquire('lib/test-adapter/playwright', {
            'image-size': imageSizeStub,
            './cache/playwright': playwrightCache
        }).PlaywrightTestAdapter;
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('assertViewResults', () => {
        it('should return an IMAGE_DIFF result when error is IMAGE_DIFF and all images are present', () => {
            const testCaseStub = mkTestCase();
            const testResultStub = mkTestResult();
            const adapter = new PlaywrightTestAdapter(testCaseStub, testResultStub, mkAdapterOptions());

            const results = adapter.assertViewResults as ImageDiffError[];

            assert.lengthOf(results, 1);
            assert.strictEqual(results[0].name, ErrorName.IMAGE_DIFF);
            assert.strictEqual(results[0].stateName, 'state1');
            assert.strictEqual(results[0].refImg?.path, 'state1' + ImageTitleEnding.Expected);
            assert.strictEqual(results[0].diffImg?.path, 'state1' + ImageTitleEnding.Diff);
            assert.strictEqual(results[0].currImg?.path, 'state1' + ImageTitleEnding.Actual);
        });

        it('should return a NO_REF_IMAGE result when error is NO_REF_IMAGE and only actual image is present', () => {
            const testCaseStub = mkTestCase();
            const testResultStub = mkTestResult({
                attachments: [createAttachment('state1' + ImageTitleEnding.Actual)],
                errors: [{name: ErrorName.NO_REF_IMAGE, message: 'snapshot doesn\'t exist: some.png.', stack: 'error-stack'}] as any
            });
            const adapter = new PlaywrightTestAdapter(testCaseStub, testResultStub, mkAdapterOptions());

            const results = adapter.assertViewResults as NoRefImageError[];

            assert.lengthOf(results, 1);
            assert.strictEqual(results[0].name, ErrorName.NO_REF_IMAGE);
            assert.strictEqual(results[0].stateName, 'state1');
            assert.strictEqual(results[0].currImg?.path, 'state1' + ImageTitleEnding.Actual);
        });
    });

    describe('attempt', () => {
        it('should return suite attempt', () => {
            // eslint-disable-next-line no-new
            new PlaywrightTestAdapter(mkTestCase(), mkTestResult(), mkAdapterOptions());
            const adapter2 = new PlaywrightTestAdapter(mkTestCase({titlePath: sinon.stub().returns(['another-title'])}), mkTestResult(), mkAdapterOptions());
            const adapter3 = new PlaywrightTestAdapter(mkTestCase(), mkTestResult(), mkAdapterOptions());

            assert.equal(adapter3.attempt, 1);
            assert.equal(adapter2.attempt, 0);
        });

        it('should not increment attempt for skipped tests', () => {
            const testResult = mkTestResult({status: 'skipped'});

            // eslint-disable-next-line no-new
            new PlaywrightTestAdapter(mkTestCase(), testResult, mkAdapterOptions());
            const adapter2 = new PlaywrightTestAdapter(mkTestCase(), testResult, mkAdapterOptions());

            assert.equal(adapter2.attempt, 0);
        });
    });

    describe('browserId', () => {
        it('should return browserId', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult(), mkAdapterOptions());

            assert.equal(adapter.browserId, 'some-browser');
        });
    });

    describe('error', () => {
        it('should return undefined if there are no errors', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({errors: []}), mkAdapterOptions());

            const {error} = adapter;

            assert.isUndefined(error);
        });

        it('should return an error with name NO_REF_IMAGE for snapshot missing errors', () => {
            const errorMessage = 'A snapshot doesn\'t exist: image-name.png.';
            const errors = [{message: errorMessage}];
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({errors}), mkAdapterOptions());

            const {error} = adapter;

            assert.strictEqual(error?.name, ErrorName.NO_REF_IMAGE);
            assert.strictEqual(error?.message, errorMessage);
        });

        it('should return an error with name IMAGE_DIFF for screenshot comparison failures', () => {
            const errorMessage = 'Screenshot comparison failed';
            const errors = [{message: errorMessage}];
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({errors}), mkAdapterOptions());

            const {error} = adapter;

            assert.strictEqual(error?.name, ErrorName.IMAGE_DIFF);
            assert.strictEqual(error?.message, errorMessage);
        });

        it('should include the error stack if present', () => {
            const errorMessage = 'Some error occurred';
            const errorStack = 'Error: Some error occurred at some-file.ts:10:15';
            const errors = [{message: errorMessage, stack: errorStack}];
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({errors}), mkAdapterOptions());

            const {error} = adapter;

            assert.strictEqual(error?.stack, errorStack);
        });

        it('should convert multiple errors to a single JSON string', () => {
            const errors = [
                {message: 'First error', stack: 'Error: First error at some-file.ts:5:10'},
                {message: 'Second error', stack: 'Error: Second error at another-file.ts:15:20'}
            ];
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({errors}), mkAdapterOptions());
            const expectedMessage = JSON.stringify(errors.map(err => err.message));
            const expectedStack = JSON.stringify(errors.map(err => err.stack));

            const {error} = adapter;

            assert.strictEqual(error?.message, expectedMessage);
            assert.strictEqual(error?.stack, expectedStack);
        });
    });

    describe('file', () => {
        it('should return file path', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult(), mkAdapterOptions());

            assert.strictEqual(adapter.file, 'test-file-path');
        });
    });

    describe('fullName', () => {
        it('should return fullName', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult(), mkAdapterOptions());

            assert.strictEqual(adapter.fullName, 'describe › test');
        });
    });

    describe('history', () => {
        it('should return an array of formatted step titles and durations', () => {
            const steps = [
                {title: 'Step1', duration: 100},
                {title: 'Step2', duration: 200}
            ];
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({steps} as any), mkAdapterOptions());
            const expectedHistory = ['Step1 <- 100ms\n', 'Step2 <- 200ms\n'];

            assert.deepEqual(adapter.history, expectedHistory);
        });
    });

    describe('id', () => {
        it('should return id', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult(), mkAdapterOptions());

            assert.strictEqual(adapter.id, 'describe test some-browser 0');
        });
    });

    describe('imageDir', () => {
        it('should return imageDir', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult(), mkAdapterOptions());

            assert.strictEqual(adapter.imageDir, '4050de5');
        });
    });

    describe('imagesInfo', () => {
        it('should call formatter', () => {
            const getImagesInfoStub = sinon.stub();
            const options = mkAdapterOptions({imagesInfoFormatter: {getImagesInfo: getImagesInfoStub}});
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult(), options);

            adapter.imagesInfo;

            assert.calledOnceWith(getImagesInfoStub, adapter);
        });
    });

    describe('status', () => {
        it('should return SUCCESS for PASSED PwtTestStatus', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({status: PwtTestStatus.PASSED}), mkAdapterOptions());

            assert.equal(adapter.status, TestStatus.SUCCESS);
        });

        it('should return FAIL for FAILED PwtTestStatus', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({status: PwtTestStatus.FAILED}), mkAdapterOptions());

            assert.equal(adapter.status, TestStatus.FAIL);
        });

        it('should return FAIL for TIMED_OUT PwtTestStatus', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({status: PwtTestStatus.TIMED_OUT}), mkAdapterOptions());

            assert.equal(adapter.status, TestStatus.FAIL);
        });

        it('should return FAIL for INTERRUPTED PwtTestStatus', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({status: PwtTestStatus.INTERRUPTED}), mkAdapterOptions());

            assert.equal(adapter.status, TestStatus.FAIL);
        });

        it('should return SKIPPED for any other PwtTestStatus', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({status: PwtTestStatus.SKIPPED}), mkAdapterOptions());

            assert.equal(adapter.status, TestStatus.SKIPPED);
        });
    });

    describe('testPath', () => {
        it('should return testPath', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult(), mkAdapterOptions());

            assert.deepEqual(adapter.testPath, ['describe', 'test']);
        });
    });
});
