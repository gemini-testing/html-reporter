import {determineStatus, buildUrl} from 'lib/common-utils';
import {RUNNING, QUEUED, ERROR, FAIL, UPDATED, SUCCESS, IDLE, SKIPPED} from 'lib/constants/test-statuses';

describe('common-utils', () => {
    describe('determineStatus', () => {
        it(`should not rewrite suite status to "${IDLE}" if some test already has final status`, () => {
            const status = determineStatus([SUCCESS, IDLE]);

            assert.equal(status, SUCCESS);
        });

        it(`should return "${SUCCESS}" if statuses is not passed`, () => {
            const status = determineStatus([]);

            assert.equal(status, SUCCESS);
        });

        describe('return the highest priority status from passed', () => {
            it(`should return "${RUNNING}" regardless of order`, () => {
                const statuses = [SKIPPED, IDLE, SUCCESS, UPDATED, FAIL, ERROR, QUEUED, RUNNING];

                const statusInDirectOrder = determineStatus(statuses);
                const statusInReverseOrder = determineStatus(statuses.reverse());

                assert.equal(statusInDirectOrder, RUNNING);
                assert.equal(statusInReverseOrder, RUNNING);
            });

            it(`should return "${QUEUED}" regardless of order`, () => {
                const statuses = [SKIPPED, IDLE, SUCCESS, UPDATED, FAIL, ERROR, QUEUED];

                const statusInDirectOrder = determineStatus(statuses);
                const statusInReverseOrder = determineStatus(statuses.reverse());

                assert.equal(statusInDirectOrder, QUEUED);
                assert.equal(statusInReverseOrder, QUEUED);
            });

            it(`should return "${ERROR}" regardless of order`, () => {
                const statuses = [SKIPPED, IDLE, SUCCESS, UPDATED, FAIL, ERROR];

                const statusInDirectOrder = determineStatus(statuses);
                const statusInReverseOrder = determineStatus(statuses.reverse());

                assert.equal(statusInDirectOrder, ERROR);
                assert.equal(statusInReverseOrder, ERROR);
            });

            it(`should return "${FAIL}" regardless of order`, () => {
                const statuses = [SKIPPED, IDLE, SUCCESS, UPDATED, FAIL];

                const statusInDirectOrder = determineStatus(statuses);
                const statusInReverseOrder = determineStatus(statuses.reverse());

                assert.equal(statusInDirectOrder, FAIL);
                assert.equal(statusInReverseOrder, FAIL);
            });

            it(`should return "${UPDATED}" regardless of order`, () => {
                const statuses = [SKIPPED, IDLE, SUCCESS, UPDATED];

                const statusInDirectOrder = determineStatus(statuses);
                const statusInReverseOrder = determineStatus(statuses.reverse());

                assert.equal(statusInDirectOrder, UPDATED);
                assert.equal(statusInReverseOrder, UPDATED);
            });

            it(`should return "${SUCCESS}" regardless of order`, () => {
                const statuses = [SKIPPED, IDLE, SUCCESS];

                const statusInDirectOrder = determineStatus(statuses);
                const statusInReverseOrder = determineStatus(statuses.reverse());

                assert.equal(statusInDirectOrder, SUCCESS);
                assert.equal(statusInReverseOrder, SUCCESS);
            });

            it(`should return "${IDLE}" regardless of order`, () => {
                const statuses = [SKIPPED, IDLE];

                const statusInDirectOrder = determineStatus(statuses);
                const statusInReverseOrder = determineStatus(statuses.reverse());

                assert.equal(statusInDirectOrder, IDLE);
                assert.equal(statusInReverseOrder, IDLE);
            });

            it(`should return "${SKIPPED}"`, () => {
                const status = determineStatus([SKIPPED]);

                assert.equal(status, SKIPPED);
            });
        });
    });
    describe('buildUrl', () => {
        it('should return href as is if host is not provided', () => {
            const href = 'https://example.com';

            const url = buildUrl(href);

            assert.equal(url, href);
        });

        it('should return url with specified host if it is provided', () => {
            const href = 'https://oldhost.com/path';
            const parsedHost = {host: 'newhost.com'};

            const url = buildUrl(href, parsedHost);

            assert.equal(url, 'https://newhost.com/path');
        });
    });
});
