'use strict';

const SuiteAdapter = require('lib/suite-adapter');

describe('suite adapter', () => {
    it('should return suite skip reason', () => {
        const suite = {skipReason: 'some-reason'};

        const hermioneSuiteAdapter = new SuiteAdapter(suite);

        assert.equal(hermioneSuiteAdapter.skipComment, 'some-reason');
    });

    it('should return suite parent skip reason', () => {
        const suite = {parent: {skipReason: 'some-reason'}};

        const hermioneSuiteAdapter = new SuiteAdapter(suite);

        assert.equal(hermioneSuiteAdapter.skipComment, 'some-reason');
    });

    it('should return suite full name', () => {
        const suite = {fullTitle: () => 'some-name'};

        const hermioneSuiteAdapter = new SuiteAdapter(suite);

        assert.equal(hermioneSuiteAdapter.fullName, 'some-name');
    });

    it('should return suite path', () => {
        const suite = {
            title: 'suite-title',
            parent: {
                title: 'some-title',
                parent: {
                    title: 'other-title',
                    parent: {
                        root: true
                    }
                }
            }
        };

        const hermioneSuiteAdapter = new SuiteAdapter(suite);

        assert.deepEqual(hermioneSuiteAdapter.path, ['other-title', 'some-title']);
    });

    it('should return suite file', () => {
        const suite = {file: 'some-file.js'};

        const hermioneSuiteAdapter = new SuiteAdapter(suite);

        assert.equal(hermioneSuiteAdapter.file, 'some-file.js');
    });

    it('should return suite url', () => {
        const suite = {meta: {url: 'http://expected.url'}};

        const hermioneSuiteAdapter = new SuiteAdapter(suite);

        assert.equal(hermioneSuiteAdapter.getUrl(), 'http://expected.url');
    });

    it('should return suite full url', () => {
        const suite = {meta: {url: 'some/url'}};

        const hermioneSuiteAdapter = new SuiteAdapter(suite);

        assert.equal(hermioneSuiteAdapter.getUrl(), 'some/url');
    });
});
