'use strict';

const {getSuitePath} = require('src/plugin-utils').getHermioneUtils();

describe('getHermioneUtils', () => {
    describe('getSuitePath', () => {
        it('should return correct path for simple suite', () => {
            const suite = {
                parent: {
                    root: true
                },
                title: 'some-title'
            };

            const suitePath = getSuitePath(suite);

            assert.deepEqual(suitePath, ['some-title']);
        });

        it('should return correct path for nested suite', () => {
            const suite = {
                parent: {
                    parent: {
                        root: true
                    },
                    title: 'root-title'
                },
                title: 'some-title'
            };

            const suitePath = getSuitePath(suite);

            assert.deepEqual(suitePath, ['root-title', 'some-title']);
        });
    });
});
