'use strict';

const {isAbsoluteUrl} = require('lib/merge-reports/utils');

describe('lib/merge-reports/utils', () => {
    describe('isAbsoluteUrl', () => {
        it('should return "true" for the absolute urls', () => {
            assert.isTrue(isAbsoluteUrl('https://'));
            assert.isTrue(isAbsoluteUrl('https://host.com'));
            assert.isTrue(isAbsoluteUrl('https://host.com/path'));
            assert.isTrue(isAbsoluteUrl('http://'));
            assert.isTrue(isAbsoluteUrl('http://host.com'));
            assert.isTrue(isAbsoluteUrl('http://host.com/path'));
        });

        it('should return "false" for the non absolute urls', () => {
            assert.isFalse(isAbsoluteUrl('//some/path'));
            assert.isFalse(isAbsoluteUrl('/some/path'));
            assert.isFalse(isAbsoluteUrl('some/path'));
            assert.isFalse(isAbsoluteUrl('some/path/'));
        });
    });
});
