'use strict';
var GeminiTestResultAdapter = require('../../../lib/test-adapter/gemini-test-adapter');
describe('gemini test adapter', function () {
    var sandbox = sinon.sandbox.create();
    afterEach(function () { return sandbox.restore(); });
    it('should return test error with "message" and "stack"', function () {
        var testResult = { message: 'some-message', stack: 'some-stack', foo: 'bar' };
        var geminiTestAdapter = new GeminiTestResultAdapter(testResult, {});
        assert.deepEqual(geminiTestAdapter.error, { message: 'some-message', stack: 'some-stack' });
    });
    describe('hasDiff', function () {
        it('should return "false" if test passed successfully', function () {
            var geminiTestAdapter = new GeminiTestResultAdapter({ equal: true });
            assert.isFalse(geminiTestAdapter.hasDiff());
        });
        it('should return "false" if test errored (does not have image comparison result)', function () {
            var geminiTestAdapter = new GeminiTestResultAdapter({});
            assert.isFalse(geminiTestAdapter.hasDiff());
        });
        it('should return "true" if test failed', function () {
            var geminiTestAdapter = new GeminiTestResultAdapter({ equal: false });
            assert.isTrue(geminiTestAdapter.hasDiff());
        });
    });
    it('should save diff with passed args', function () {
        var saveDiffTo = sandbox.stub();
        var testResult = { saveDiffTo: saveDiffTo };
        var geminiTestAdapter = new GeminiTestResultAdapter(testResult);
        geminiTestAdapter.saveDiffTo('some-arg');
        assert.calledWith(saveDiffTo, 'some-arg');
    });
    it('should return image dir', function () {
        var testResult = { suite: { path: 'some-path' }, state: { name: 'some-name' } };
        var geminiTestAdapter = new GeminiTestResultAdapter(testResult);
        assert.deepEqual(geminiTestAdapter.imageDir, 'some-path/some-name');
    });
    it('should return image path', function () {
        var geminiTestAdapter = new GeminiTestResultAdapter({ imagePath: 'some-value' });
        assert.equal(geminiTestAdapter.getImagePath(), 'some-value');
    });
    ['state', 'attempt', 'referencePath', 'currentPath'].forEach(function (field) {
        it("should return " + field + " from test result", function () {
            var _a;
            var geminiTestAdapter = new GeminiTestResultAdapter((_a = {}, _a[field] = 'some-value', _a));
            assert.equal(geminiTestAdapter[field], 'some-value');
        });
    });
    describe('prepareTestResult()', function () {
        it('should return correct "name" field', function () {
            var testResult = {
                suite: { path: [] },
                state: { name: 'state-name' }
            };
            var result = (new GeminiTestResultAdapter(testResult)).prepareTestResult();
            assert.propertyVal(result, 'name', 'state-name');
        });
        it('should return correct "suitePath" field', function () {
            var testResult = {
                suite: { path: ['some-path'] },
                state: { name: 'state-name' }
            };
            var result = (new GeminiTestResultAdapter(testResult)).prepareTestResult();
            assert.deepEqual(result.suitePath, ['some-path', 'state-name']);
        });
        it('should return "browserId" field as is', function () {
            var testResult = {
                suite: { path: [] },
                state: {},
                browserId: 'bro'
            };
            var result = (new GeminiTestResultAdapter(testResult)).prepareTestResult();
            assert.propertyVal(result, 'browserId', 'bro');
        });
    });
});
//# sourceMappingURL=gemini-test-adapter.js.map