'use strict';

const {search, initSearch} = require('lib/static/modules/search');

describe('static/modules/search', () => {
    beforeEach(() => {
        initSearch(['cat', 'dog', 'raccoon', 'bird']);
    });

    it('init and search', () => {
        const founded = search('cat', false);

        assert.isTrue(founded.has('cat'));
    });

    it('match case', () => {
        const founded = search('CAT', false);
        const notFounded = search('CAT', true);

        assert.isTrue(founded.has('cat'));
        assert.isFalse(notFounded.has('cat'));
    });
});
