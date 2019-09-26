'use strict';

const {getSuitePath} = require('lib/plugin-utils').getHermioneUtils();

describe('getHermioneUtils', () => {
    describe('getSuitePath', () => {
        it('should return correct path for simple suite', () => {
            const suite = {parent: {root: true}, title: 'some-title'};

            const suitePath = getSuitePath(suite);

            assert.match(suitePath, ['some-title']);
        });

        it('should return correct path for complex suite', () => {
            const suite = {
                parent: {
                    parent: {
                        parent: {root: true}, title: 'root-title'
                    }, title: 'parent-title'
                },
                title: 'some-title'
            };

            const suitePath = getSuitePath(suite);

            assert.match(suitePath, ['root-title', 'parent-title', 'some-title']);
        });
    });
});
