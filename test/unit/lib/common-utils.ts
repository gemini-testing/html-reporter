import {determineFinalStatus, getError, hasDiff, getUrlWithBase, getDetailsFileName} from 'lib/common-utils';
import {RUNNING, QUEUED, ERROR, FAIL, UPDATED, SUCCESS, IDLE, SKIPPED} from 'lib/constants/test-statuses';
import {ErrorName} from 'lib/errors';
import sinon from 'sinon';

describe('common-utils', () => {
    const sandbox = sinon.sandbox.create();

    afterEach(() => sandbox.restore());

    describe('getUrlWithBase', () => {
        it('should change host of the url', () => {
            const userUrl = 'https://example.com/test/123?a=1#hello';
            const baseUrl = 'https://some.site.xyz';

            const result = getUrlWithBase(userUrl, baseUrl);

            assert.equal(result, 'https://some.site.xyz/test/123?a=1#hello');
        });

        it('should work with relative urls', () => {
            const userUrl = '/test/123?a=1#hello';
            const baseUrl = 'https://example.com';

            const result = getUrlWithBase(userUrl, baseUrl);

            assert.equal(result, 'https://example.com/test/123?a=1#hello');
        });

        it('should work without baseUrl', () => {
            const result = getUrlWithBase('some-url', '');

            assert.equal(result, 'some-url');
        });
    });

    describe('getError', () => {
        it('should return test error with "message", "stack" and "stateName"', () => {
            const error = {
                name: 'some-name',
                message: 'some-message',
                stack: 'some-stack',
                stateName: 'some-test',
                foo: 'bar'
            };

            const result = getError(error);

            assert.deepEqual(result, {
                name: 'some-name',
                message: 'some-message',
                stack: 'some-stack',
                stateName: 'some-test'
            });
        });
    });

    describe('hasDiff', () => {
        it('should return true if test has image diff errors', () => {
            const assertViewResults = [{name: ErrorName.IMAGE_DIFF} as any];

            assert.isTrue(hasDiff(assertViewResults));
        });

        it('should return false if test has not image diff errors', () => {
            const assertViewResults = [new Error() as any];

            assert.isFalse(hasDiff(assertViewResults));
        });
    });

    describe('determineStatus', () => {
        it(`should not rewrite suite status to "${IDLE}" if some test already has final status`, () => {
            const status = determineFinalStatus([SUCCESS, IDLE]);

            assert.equal(status, SUCCESS);
        });

        it(`should return "${SUCCESS}" if statuses is not passed`, () => {
            const status = determineFinalStatus([]);

            assert.equal(status, SUCCESS);
        });

        describe('return the highest priority status from passed', () => {
            it(`should return "${RUNNING}" regardless of order`, () => {
                const statuses = [SKIPPED, IDLE, SUCCESS, UPDATED, FAIL, ERROR, QUEUED, RUNNING];

                const statusInDirectOrder = determineFinalStatus(statuses);
                const statusInReverseOrder = determineFinalStatus(statuses.reverse());

                assert.equal(statusInDirectOrder, RUNNING);
                assert.equal(statusInReverseOrder, RUNNING);
            });

            it(`should return "${QUEUED}" regardless of order`, () => {
                const statuses = [SKIPPED, IDLE, SUCCESS, UPDATED, FAIL, ERROR, QUEUED];

                const statusInDirectOrder = determineFinalStatus(statuses);
                const statusInReverseOrder = determineFinalStatus(statuses.reverse());

                assert.equal(statusInDirectOrder, QUEUED);
                assert.equal(statusInReverseOrder, QUEUED);
            });

            it(`should return "${ERROR}" regardless of order`, () => {
                const statuses = [SKIPPED, IDLE, SUCCESS, UPDATED, FAIL, ERROR];

                const statusInDirectOrder = determineFinalStatus(statuses);
                const statusInReverseOrder = determineFinalStatus(statuses.reverse());

                assert.equal(statusInDirectOrder, ERROR);
                assert.equal(statusInReverseOrder, ERROR);
            });

            it(`should return "${FAIL}" regardless of order`, () => {
                const statuses = [SKIPPED, IDLE, SUCCESS, UPDATED, FAIL];

                const statusInDirectOrder = determineFinalStatus(statuses);
                const statusInReverseOrder = determineFinalStatus(statuses.reverse());

                assert.equal(statusInDirectOrder, FAIL);
                assert.equal(statusInReverseOrder, FAIL);
            });

            it(`should return "${UPDATED}" regardless of order`, () => {
                const statuses = [SKIPPED, IDLE, SUCCESS, UPDATED];

                const statusInDirectOrder = determineFinalStatus(statuses);
                const statusInReverseOrder = determineFinalStatus(statuses.reverse());

                assert.equal(statusInDirectOrder, UPDATED);
                assert.equal(statusInReverseOrder, UPDATED);
            });

            it(`should return "${SUCCESS}" regardless of order`, () => {
                const statuses = [SKIPPED, IDLE, SUCCESS];

                const statusInDirectOrder = determineFinalStatus(statuses);
                const statusInReverseOrder = determineFinalStatus(statuses.reverse());

                assert.equal(statusInDirectOrder, SUCCESS);
                assert.equal(statusInReverseOrder, SUCCESS);
            });

            it(`should return "${IDLE}" regardless of order`, () => {
                const statuses = [SKIPPED, IDLE];

                const statusInDirectOrder = determineFinalStatus(statuses);
                const statusInReverseOrder = determineFinalStatus(statuses.reverse());

                assert.equal(statusInDirectOrder, IDLE);
                assert.equal(statusInReverseOrder, IDLE);
            });

            it(`should return "${SKIPPED}"`, () => {
                const status = determineFinalStatus([SKIPPED]);

                assert.equal(status, SKIPPED);
            });
        });
    });

    describe('getDetailsFileName', () => {
        it('should compose correct file name from suite path, browser id and attempt', () => {
            sandbox.stub(Date, 'now').returns('123456789');
            const testId = 'abcdef';
            const expected = `${testId}-bro_2_123456789.json`;

            assert.equal(getDetailsFileName(testId, 'bro', 1), expected);
        });
    });
});
