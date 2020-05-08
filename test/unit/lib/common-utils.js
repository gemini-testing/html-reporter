'use strict';

const sinon = require('sinon');
const {determineStatus, formatBrowsers} = require('lib/common-utils');
const {SUCCESS, IDLE} = require('lib/constants/test-statuses');

describe('common-utils', () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('determineStatus', () => {
        it(`should not rewrite suite status to ${IDLE} if some test already has final status`, () => {
            const status = determineStatus([SUCCESS, IDLE]);

            assert.equal(status, SUCCESS);
        });
    });

    describe('formatBrowsers', () => {
        it('should format a linear browser list into appropriate structure by collection', () => {
            const collectionStub = {
                getBrowsers: sandbox.stub().returns(['bro1', 'bro2'])
            };
            const browsers = formatBrowsers(collectionStub);

            assert.deepEqual(browsers, [
                {id: 'bro1'},
                {id: 'bro2'}
            ]);
        });
    });
});
