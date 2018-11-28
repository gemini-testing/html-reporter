'use strict';
var GeminiSuiteAdapter = require('../../../lib/suite-adapter/gemini-suite-adapter');
describe('gemini suite adapter', function () {
    var sandbox = sinon.sandbox.create();
    afterEach(function () { return sandbox.restore(); });
    it('should return suite skip reason', function () {
        var suite = { skipComment: 'some-reason' };
        var geminiSuiteAdapter = new GeminiSuiteAdapter(suite);
        assert.equal(geminiSuiteAdapter.skipComment, 'some-reason');
    });
    it('should resolve absolute suite url', function () {
        var forBrowser = sandbox.stub();
        forBrowser.withArgs('bro1').returns({
            getAbsoluteUrl: sandbox.stub().withArgs('/some/url').returns('http://expected.url/some/url')
        });
        var config = { forBrowser: forBrowser };
        var geminiSuiteAdapter = new GeminiSuiteAdapter({ url: '/some/url' }, config);
        assert.equal(geminiSuiteAdapter.getUrl({ browserId: 'bro1' }), 'http://expected.url/some/url');
    });
    it('should resolve absolute suite url using passed base host', function () {
        var forBrowser = sandbox.stub();
        forBrowser.withArgs('bro1').returns({
            getAbsoluteUrl: sandbox.stub().withArgs('/some/url').returns('http://expected.url/some/url')
        });
        var config = { forBrowser: forBrowser };
        var geminiSuiteAdapter = new GeminiSuiteAdapter({ url: '/some/url' }, config);
        assert.equal(geminiSuiteAdapter.getUrl({ browserId: 'bro1', baseHost: 'http://base.url' }), 'http://base.url/some/url');
    });
    it('should return full url', function () {
        var geminiSuiteAdapter = new GeminiSuiteAdapter({ fullUrl: 'some/full/url' });
        assert.equal(geminiSuiteAdapter.fullUrl, 'some/full/url');
    });
    ['fullUrl', 'path', 'file', 'fullName'].forEach(function (field) {
        it("should return " + field + " from suite", function () {
            var _a;
            var geminiSuiteAdapter = new GeminiSuiteAdapter((_a = {}, _a[field] = 'some-value', _a));
            assert.equal(geminiSuiteAdapter[field], 'some-value');
        });
    });
});
//# sourceMappingURL=gemini-suite-adapter.js.map