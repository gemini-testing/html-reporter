'use strict';
var HermioneSuiteAdapter = require('../../../lib/suite-adapter/hermione-suite-adapter');
describe('hermione suite adapter', function () {
    it('should return suite skip reason', function () {
        var suite = { skipReason: 'some-reason' };
        var hermioneSuiteAdapter = new HermioneSuiteAdapter(suite);
        assert.equal(hermioneSuiteAdapter.skipComment, 'some-reason');
    });
    it('should return suite parent skip reason', function () {
        var suite = { parent: { skipReason: 'some-reason' } };
        var hermioneSuiteAdapter = new HermioneSuiteAdapter(suite);
        assert.equal(hermioneSuiteAdapter.skipComment, 'some-reason');
    });
    it('should return suite full name', function () {
        var suite = { fullTitle: function () { return 'some-name'; } };
        var hermioneSuiteAdapter = new HermioneSuiteAdapter(suite);
        assert.equal(hermioneSuiteAdapter.fullName, 'some-name');
    });
    it('should return suite path', function () {
        var suite = {
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
        var hermioneSuiteAdapter = new HermioneSuiteAdapter(suite);
        assert.deepEqual(hermioneSuiteAdapter.path, ['other-title', 'some-title']);
    });
    it('should return suite file', function () {
        var suite = { file: 'some-file.js' };
        var hermioneSuiteAdapter = new HermioneSuiteAdapter(suite);
        assert.equal(hermioneSuiteAdapter.file, 'some-file.js');
    });
    it('should return suite url', function () {
        var suite = { meta: { url: 'http://expected.url' } };
        var hermioneSuiteAdapter = new HermioneSuiteAdapter(suite);
        assert.equal(hermioneSuiteAdapter.getUrl(), 'http://expected.url');
    });
    it('should return suite full url', function () {
        var suite = { meta: { url: 'some/url' } };
        var hermioneSuiteAdapter = new HermioneSuiteAdapter(suite);
        assert.equal(hermioneSuiteAdapter.getUrl(), 'some/url');
    });
});
//# sourceMappingURL=hermione-suite-adapter.js.map