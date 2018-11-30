'use strict';

const GeminiTestResultAdapter = require('lib/test-adapter/gemini-test-adapter');

describe('gemini test adapter', () => {
    const sandbox = sinon.sandbox.create();

    afterEach(() => sandbox.restore());

    it('should return test error with "message" and "stack"', () => {
        const testResult = {message: 'some-message', stack: 'some-stack', foo: 'bar'};

        const geminiTestAdapter = new GeminiTestResultAdapter(testResult, {});

        assert.deepEqual(geminiTestAdapter.error, {message: 'some-message', stack: 'some-stack'});
    });

    describe('hasDiff', () => {
        it('should return "false" if test passed successfully', () => {
            const geminiTestAdapter = new GeminiTestResultAdapter({equal: true});

            assert.isFalse(geminiTestAdapter.hasDiff());
        });

        it('should return "false" if test errored (does not have image comparison result)', () => {
            const geminiTestAdapter = new GeminiTestResultAdapter({});

            assert.isFalse(geminiTestAdapter.hasDiff());
        });

        it('should return "true" if test failed', () => {
            const geminiTestAdapter = new GeminiTestResultAdapter({equal: false});

            assert.isTrue(geminiTestAdapter.hasDiff());
        });
    });

    it('should save diff with passed args', () => {
        const saveDiffTo = sandbox.stub();
        const testResult = {saveDiffTo};
        const geminiTestAdapter = new GeminiTestResultAdapter(testResult);

        geminiTestAdapter.saveDiffTo('some-arg');

        assert.calledWith(saveDiffTo, 'some-arg');
    });

    it('should return image dir', () => {
        const testResult = {suite: {path: 'some-path'}, state: {name: 'some-name'}};

        const geminiTestAdapter = new GeminiTestResultAdapter(testResult);

        assert.deepEqual(geminiTestAdapter.imageDir, 'some-path/some-name');
    });

    it('should return image path', () => {
        const geminiTestAdapter = new GeminiTestResultAdapter({imagePath: 'some-value'});

        assert.equal(geminiTestAdapter.getImagePath(), 'some-value');
    });

    ['state', 'attempt', 'referencePath', 'currentPath'].forEach((field) => {
        it(`should return ${field} from test result`, () => {
            const geminiTestAdapter = new GeminiTestResultAdapter({[field]: 'some-value'});

            assert.equal(geminiTestAdapter[field], 'some-value');
        });
    });

    describe('prepareTestResult()', () => {
        it('should return correct "name" field', () => {
            const testResult = {
                suite: {path: []},
                state: {name: 'state-name'}
            };

            const result = (new GeminiTestResultAdapter(testResult)).prepareTestResult();

            assert.propertyVal(result, 'name', 'state-name');
        });

        it('should return correct "suitePath" field', () => {
            const testResult = {
                suite: {path: ['some-path']},
                state: {name: 'state-name'}
            };

            const result = (new GeminiTestResultAdapter(testResult)).prepareTestResult();

            assert.deepEqual(result.suitePath, ['some-path', 'state-name']);
        });

        it('should return "browserId" field as is', () => {
            const testResult = {
                suite: {path: []},
                state: {},
                browserId: 'bro'
            };

            const result = (new GeminiTestResultAdapter(testResult)).prepareTestResult();

            assert.propertyVal(result, 'browserId', 'bro');
        });
    });
});
