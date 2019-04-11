'use strict';

const {determineStatus} = require('lib/common-utils');
const {SUCCESS, IDLE} = require('lib/constants/test-statuses');

describe('common-utils', () => {
    describe('determineStatus', () => {
        it(`should not rewrite suite status to ${IDLE} if some test already has final status`, () => {
            const status = determineStatus([SUCCESS, IDLE]);

            assert.equal(status, SUCCESS);
        });
    });
});
