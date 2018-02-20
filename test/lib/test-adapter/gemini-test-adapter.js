'use strict';

const GeminiTestResultAdapter = require('../../../lib/test-adapter/gemini-test-adapter');

describe('gemini test adapter', () => {
    const sandbox = sinon.sandbox.create();

    afterEach(() => sandbox.restore());

    it('should return test error with "message" and "stack"', () => {
        const testResult = {message: 'some-message', stack: 'some-stack', foo: 'bar'};

        const geminiTestAdapter = new GeminiTestResultAdapter(testResult);

        assert.deepEqual(geminiTestAdapter.error, {message: 'some-message', stack: 'some-stack'});
    });

    describe('isEqual', () => {
        it('should return "true" if test result has own property equal', () => {
            const geminiTestAdapter = new GeminiTestResultAdapter({equal: true});

            assert.isTrue(geminiTestAdapter.isEqual());
        });

        it('should return `false` if test result does not have own property equal', () => {
            const geminiTestAdapter = new GeminiTestResultAdapter({});

            assert.isFalse(geminiTestAdapter.isEqual());
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

    ['equal', 'state', 'attempt', 'referencePath', 'currentPath', 'imagePath'].forEach((field) => {
        it(`should return ${field} from test result`, () => {
            const geminiTestAdapter = new GeminiTestResultAdapter({[field]: 'some-value'});

            assert.equal(geminiTestAdapter[field], 'some-value');
        });
    });
});
