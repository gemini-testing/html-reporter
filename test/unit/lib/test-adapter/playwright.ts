import sinon from 'sinon';
import _ from 'lodash';
import proxyquire from 'proxyquire';
import {TestCase, TestResult} from '@playwright/test/reporter';
import {
    DEFAULT_DIFF_OPTIONS,
    ImageTitleEnding,
    PlaywrightAttachment,
    PwtTestStatus
} from 'lib/test-adapter/playwright';
import {ErrorName} from 'lib/errors';
import {ERROR, FAIL, TestStatus, UNKNOWN_ATTEMPT} from 'lib/constants';
import {ImageInfoDiff, ImageInfoNoRef} from 'lib/types';

describe('PlaywrightTestAdapter', () => {
    let sandbox: sinon.SinonSandbox;
    let PlaywrightTestAdapter: typeof import('lib/test-adapter/playwright').PlaywrightTestAdapter;
    let imageSizeStub: sinon.SinonStub;

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

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        imageSizeStub = sinon.stub().returns({height: 100, width: 200});

        PlaywrightTestAdapter = proxyquire('lib/test-adapter/playwright', {
            'image-size': imageSizeStub
        }).PlaywrightTestAdapter;
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('attempt', () => {
        it('should return suite attempt', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase({titlePath: sinon.stub().returns(['another-title'])}), mkTestResult(), 3);

            assert.equal(adapter.attempt, 3);
        });
    });

    describe('browserId', () => {
        it('should return browserId', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult(), UNKNOWN_ATTEMPT);

            assert.equal(adapter.browserId, 'some-browser');
        });
    });

    describe('error', () => {
        it('should return undefined if there are no errors', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({errors: []}), UNKNOWN_ATTEMPT);

            const {error} = adapter;

            assert.isUndefined(error);
        });

        it('should return an error with name NO_REF_IMAGE for snapshot missing errors', () => {
            const errorMessage = 'A snapshot doesn\'t exist: image-name.png.';
            const errors = [{message: errorMessage}];
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({errors}), UNKNOWN_ATTEMPT);

            const {error} = adapter;

            assert.strictEqual(error?.name, ErrorName.NO_REF_IMAGE);
            assert.strictEqual(error?.message, errorMessage);
        });

        it('should return an error with name IMAGE_DIFF for screenshot comparison failures', () => {
            const errorMessage = 'Screenshot comparison failed';
            const errors = [{message: errorMessage}];
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({errors}), UNKNOWN_ATTEMPT);

            const {error} = adapter;

            assert.strictEqual(error?.name, ErrorName.IMAGE_DIFF);
            assert.strictEqual(error?.message, errorMessage);
        });

        it('should include the error stack if present', () => {
            const errorMessage = 'Some error occurred';
            const errorStack = 'Error: Some error occurred at some-file.ts:10:15';
            const errors = [{message: errorMessage, stack: errorStack}];
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({errors}), UNKNOWN_ATTEMPT);

            const {error} = adapter;

            assert.strictEqual(error?.stack, errorStack);
        });

        it('should convert multiple errors to a single JSON string', () => {
            const errors = [
                {message: 'First error', stack: 'Error: First error at some-file.ts:5:10'},
                {message: 'Second error', stack: 'Error: Second error at another-file.ts:15:20'}
            ];
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({errors}), UNKNOWN_ATTEMPT);
            const expectedMessage = JSON.stringify(errors.map(err => err.message));
            const expectedStack = JSON.stringify(errors.map(err => err.stack));

            const {error} = adapter;

            assert.strictEqual(error?.message, expectedMessage);
            assert.strictEqual(error?.stack, expectedStack);
        });
    });

    describe('file', () => {
        it('should return file path', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult(), UNKNOWN_ATTEMPT);

            assert.strictEqual(adapter.file, 'test-file-path');
        });
    });

    describe('fullName', () => {
        it('should return fullName', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult(), UNKNOWN_ATTEMPT);

            assert.strictEqual(adapter.fullName, 'describe › test');
        });
    });

    describe('history', () => {
        it('should return an array of formatted step titles and durations', () => {
            const steps = [
                {title: 'Step1', duration: 100},
                {title: 'Step2', duration: 200}
            ];
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({steps} as any), UNKNOWN_ATTEMPT);
            const expectedHistory = ['Step1 <- 100ms\n', 'Step2 <- 200ms\n'];

            assert.deepEqual(adapter.history, expectedHistory);
        });
    });

    describe('id', () => {
        it('should return id', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult(), 0);

            assert.strictEqual(adapter.id, 'describe test some-browser 0');
        });
    });

    describe('imageDir', () => {
        it('should return imageDir', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult(), UNKNOWN_ATTEMPT);

            assert.strictEqual(adapter.imageDir, '4050de5');
        });
    });

    describe('imagesInfo', () => {
        it('should correctly format diff result', () => {
            const errors = [{message: 'Screenshot comparison failed', stack: ''}];
            const attachments: TestResult['attachments'] = [
                {name: `header-actual.png`, path: 'test-results/header-actual.png', contentType: 'image/png'},
                {name: `header-expected.png`, path: 'project-dir/header-expected.png', contentType: 'image/png'},
                {name: `header-diff.png`, path: 'test-results/header-diff.png', contentType: 'image/png'},
                {name: 'screenshot', path: 'test-results/test-name-1.png', contentType: 'image/png'}
            ];

            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({attachments, errors}), UNKNOWN_ATTEMPT);

            assert.equal(adapter.imagesInfo.length, 2);
            assert.deepEqual(adapter.imagesInfo.find(info => (info as ImageInfoDiff).stateName === undefined), {
                status: ERROR,
                actualImg: {path: `test-results/test-name-1.png`, size: {height: 100, width: 200}}
            });
            assert.deepEqual(adapter.imagesInfo.find(info => (info as ImageInfoDiff).stateName === 'header'), {
                status: FAIL,
                stateName: 'header',
                actualImg: {path: `test-results/header-actual.png`, size: {height: 100, width: 200}},
                expectedImg: {path: 'project-dir/header-expected.png', size: {height: 100, width: 200}},
                diffImg: {path: 'test-results/header-diff.png', size: {height: 100, width: 200}},
                diffClusters: [],
                diffOptions: {current: 'test-results/header-actual.png', reference: 'project-dir/header-expected.png', ...DEFAULT_DIFF_OPTIONS}
            });
        });

        it('should correctly format no ref result', () => {
            const errors = [{message: 'snapshot doesn\'t exist at some.png', stack: ''}];
            const attachments: TestResult['attachments'] = [
                {name: `header-actual.png`, path: 'test-results/header-actual.png', contentType: 'image/png'},
                {name: 'screenshot', path: 'test-results/test-name-1.png', contentType: 'image/png'}
            ];

            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({attachments, errors}), UNKNOWN_ATTEMPT);

            assert.equal(adapter.imagesInfo.length, 2);
            assert.deepEqual(adapter.imagesInfo.find(info => (info as ImageInfoNoRef).stateName === undefined), {
                status: ERROR,
                actualImg: {path: `test-results/test-name-1.png`, size: {height: 100, width: 200}}
            });
            assert.deepEqual(adapter.imagesInfo.find(info => (info as ImageInfoNoRef).stateName === 'header'), {
                status: ERROR,
                stateName: 'header',
                error: {
                    name: ErrorName.NO_REF_IMAGE,
                    message: 'snapshot doesn\'t exist at some.png',
                    stack: ''
                },
                actualImg: {path: `test-results/header-actual.png`, size: {height: 100, width: 200}}
            });
        });
    });

    describe('status', () => {
        it('should return SUCCESS for PASSED PwtTestStatus', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({status: PwtTestStatus.PASSED}), UNKNOWN_ATTEMPT);

            assert.equal(adapter.status, TestStatus.SUCCESS);
        });

        it('should return FAIL for FAILED PwtTestStatus', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({status: PwtTestStatus.FAILED}), UNKNOWN_ATTEMPT);

            assert.equal(adapter.status, TestStatus.FAIL);
        });

        it('should return FAIL for TIMED_OUT PwtTestStatus', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({status: PwtTestStatus.TIMED_OUT}), UNKNOWN_ATTEMPT);

            assert.equal(adapter.status, TestStatus.FAIL);
        });

        it('should return FAIL for INTERRUPTED PwtTestStatus', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({status: PwtTestStatus.INTERRUPTED}), UNKNOWN_ATTEMPT);

            assert.equal(adapter.status, TestStatus.FAIL);
        });

        it('should return SKIPPED for any other PwtTestStatus', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult({status: PwtTestStatus.SKIPPED}), UNKNOWN_ATTEMPT);

            assert.equal(adapter.status, TestStatus.SKIPPED);
        });
    });

    describe('testPath', () => {
        it('should return testPath', () => {
            const adapter = new PlaywrightTestAdapter(mkTestCase(), mkTestResult(), UNKNOWN_ATTEMPT);

            assert.deepEqual(adapter.testPath, ['describe', 'test']);
        });
    });
});
