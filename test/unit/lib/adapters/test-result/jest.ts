import path from 'path';
import sinon from 'sinon';
import _ from 'lodash';
import {Test, TestContext, TestResult} from '@jest/reporters';
import {AssertionResult, JestTestResultAdapter} from 'lib/adapters/test-result/jest';
import {TestStatus} from 'lib/constants';

export const mkTest = (overrides: Partial<Test> = {}): Test => _.defaultsDeep(overrides, {
    path: path.join(process.cwd(), 'test', 'example.js'),
    duration: 100,
    context: {
        config: {
            displayName: undefined
        }
    } as any as TestContext // Adapter uses only display name from context.config.
} satisfies Test);

export const mkTestResult = (overrides: Partial<TestResult> = {}): TestResult => _.defaultsDeep(overrides, {
    numFailingTests: 0,
    numPassingTests: 0,
    perfStats: {
        start: 0,
        end: 100,
        runtime: 100,
        slow: false
    },
    skipped: false
} as TestResult);

export const mkAssertionResult = (overrides: Partial<AssertionResult> = {}): AssertionResult => _.defaultsDeep(overrides, {
    title: 'it should do something',
    status: 'failed',
    failureDetails: [
        {
            message: 'failure details'
        }
    ],
    failureMessages: [
        'failure message'
    ],
    ancestorTitles: [
        'describe 1',
        'describe 2'
    ],
    fullName: 'descirbe 1 describe 2 it should do something',
    duration: 10
} as AssertionResult);

describe('JestTestResultAdapter', () => {
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('regular getters', () => {
        let adapter: JestTestResultAdapter;

        beforeEach(() => {
            adapter = new JestTestResultAdapter(
                mkTest(),
                mkTestResult(),
                mkAssertionResult(),
                1
            );
        });

        it('should return attempt', () => {
            assert.equal(adapter.attempt, 1);
        });

        it('should return the browserId as the NodeJS version', () => {
            assert.match(adapter.browserId, /^Node v\d+.\d+.\d+/);
        });

        it('should return the description', () => {
            assert.equal(adapter.description, 'it should do something');
        });

        it('should return file path relative to cwd', () => {
            assert.equal(adapter.file, 'test/example.js');
        });

        it('should return the full name as sequence of upper describe blocks and self title', () => {
            assert.equal(adapter.fullName, 'describe 1 describe 2 it should do something');
        });

        it('should return navigation path as sequence of upper describe blocks and self title', () => {
            assert.deepEqual(adapter.testPath, [
                'describe 1',
                'describe 2',
                'it should do something'
            ]);
        });

        it('should return the empty history, because test is just passing or not', () => {
            assert.isEmpty(adapter.history);
        });

        it('should return assertion duration', () => {
            assert.equal(adapter.duration, 10);
        });
    });

    describe('status getter', () => {
        it('should return error status if test is failed', () => {
            const adapter = new JestTestResultAdapter(
                mkTest(),
                mkTestResult(),
                mkAssertionResult({
                    status: 'failed'
                }),
                1
            );

            assert.equal(adapter.status, TestStatus.ERROR);
        });

        it('should return error status if test status is unknown', () => {
            const adapter = new JestTestResultAdapter(
                mkTest(),
                mkTestResult(),
                mkAssertionResult({
                    // @ts-expect-error because this is not suitable status
                    status: 'something weird'
                }),
                1
            );

            assert.equal(adapter.status, TestStatus.ERROR);
        });

        it('should return success status if test is passed', () => {
            const adapter = new JestTestResultAdapter(
                mkTest(),
                mkTestResult(),
                mkAssertionResult({
                    status: 'passed'
                }),
                1
            );

            assert.equal(adapter.status, TestStatus.SUCCESS);
        });

        it('should return success status if test is passed', () => {
            const adapter = new JestTestResultAdapter(
                mkTest(),
                mkTestResult(),
                mkAssertionResult({
                    status: 'passed'
                }),
                1
            );

            assert.equal(adapter.status, TestStatus.SUCCESS);
        });

        it('should return queued status if test is focused', () => {
            const adapter = new JestTestResultAdapter(
                mkTest(),
                mkTestResult(),
                mkAssertionResult({
                    status: 'focused'
                }),
                1
            );

            assert.equal(adapter.status, TestStatus.QUEUED);
        });

        for (const status of ['disabled', 'skipped', 'pending', 'todo'] as const) {
            it(`should return skipped status if test is ${status}`, () => {
                const adapter = new JestTestResultAdapter(
                    mkTest(),
                    mkTestResult(),
                    mkAssertionResult({
                        status
                    }),
                    1
                );

                assert.equal(adapter.status, TestStatus.SKIPPED);
            });
        }
    });

    describe('working with failing tests', () => {
        it('should return error message if test is failed', () => {
            const adapter = new JestTestResultAdapter(
                mkTest(),
                mkTestResult(),
                mkAssertionResult(),
                1
            );

            assert.containsAllKeys(adapter.error, ['name', 'message', 'stack']);
        });

        it('should return undefined if test is passing', () => {
            const adapter = new JestTestResultAdapter(
                mkTest(),
                mkTestResult(),
                mkAssertionResult({
                    status: 'passed'
                }),
                1
            );

            assert.isUndefined(adapter.error);
        });
    });
});
