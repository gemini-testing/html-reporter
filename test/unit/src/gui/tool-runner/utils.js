'use strict';

const {mkFullTitle} = require('src/gui/tool-runner/utils');

describe('src/gui/tool-runner/utils', () => {
    describe('mkFullTitle', () => {
        it('should build title if array with path is not empty', () => {
            const suite = {path: ['p1', 'p2']};
            const state = {name: 'state'};

            assert.equal(mkFullTitle({suite, state}), 'p1 p2 state');
        });

        it('should build title if array with path is empty', () => {
            const suite = {path: []};
            const state = {name: 'state'};

            assert.equal(mkFullTitle({suite, state}), 'state');
        });
    });
});
