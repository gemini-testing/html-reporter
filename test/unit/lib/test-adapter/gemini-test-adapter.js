'use strict';

const path = require('path');
const GeminiTestResultAdapter = require('lib/test-adapter/gemini-test-adapter');
const {IDLE} = require('lib/constants/test-statuses');

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

    describe('getImagesInfo', () => {
        describe('should set "imagesInfo" field', () => {
            beforeEach(() => {
                sandbox.stub(GeminiTestResultAdapter.prototype, 'getImagesFor');
            });

            it('for "idle" status', () => {
                const geminiTestAdapter = new GeminiTestResultAdapter({refImg: 'image-data'});

                geminiTestAdapter.getImagesInfo(IDLE);

                assert.deepEqual(geminiTestAdapter.imagesInfo, [{status: IDLE, expectedImg: 'image-data'}]);
            });

            describe('for not "idle" status', () => {
                it('with empty "error"', () => {
                    const geminiTestAdapter = new GeminiTestResultAdapter({suite: {path: 'some-path'}, state: {name: 'state'}});
                    GeminiTestResultAdapter.prototype.getImagesFor
                        .withArgs('some-status')
                        .returns({expectedImg: 'image-data'});

                    geminiTestAdapter.getImagesInfo('some-status');

                    assert.deepEqual(geminiTestAdapter.imagesInfo, [
                        {status: 'some-status', error: null, expectedImg: 'image-data', diffClusters: undefined}
                    ]);
                });

                it('with "error"', () => {
                    const geminiTestAdapter = new GeminiTestResultAdapter({
                        suite: {path: 'some-path'}, state: {name: 'state'},
                        message: 'msg',
                        stack: 'stack',
                        diffClusters: [{left: 0, top: 0, right: 1, bottom: 1}]
                    });
                    GeminiTestResultAdapter.prototype.getImagesFor
                        .withArgs('some-status')
                        .returns({expectedImg: 'image-data'});

                    geminiTestAdapter.getImagesInfo('some-status');

                    assert.deepEqual(geminiTestAdapter.imagesInfo, [
                        {
                            status: 'some-status',
                            error: {message: 'msg', stack: 'stack'},
                            expectedImg: 'image-data',
                            diffClusters: [{left: 0, top: 0, right: 1, bottom: 1}]
                        }
                    ]);
                });
            });
        });
    });

    it('should save diff with passed args', async () => {
        const saveDiffTo = sandbox.stub();
        const testResult = {saveDiffTo};
        const geminiTestAdapter = new GeminiTestResultAdapter(testResult);

        await geminiTestAdapter.saveDiffTo('some-arg');

        assert.calledWith(saveDiffTo, 'some-arg');
    });

    it('should return image dir', () => {
        const testResult = {suite: {path: 'some-path'}, state: {name: 'some-name'}};

        const geminiTestAdapter = new GeminiTestResultAdapter(testResult);

        assert.deepEqual(geminiTestAdapter.imageDir, path.join('some-path', 'some-name'));
    });

    ['state', 'attempt'].forEach((field) => {
        it(`should return ${field} from test result`, () => {
            const geminiTestAdapter = new GeminiTestResultAdapter({[field]: 'some-value'});

            assert.equal(geminiTestAdapter[field], 'some-value');
        });
    });

    [
        {field: 'refImg', method: 'getRefImg'},
        {field: 'currImg', method: 'getCurrImg'},
        {field: 'img', method: 'getErrImg'}
    ].forEach(({field, method}) => {
        describe(`${method}`, () => {
            it(`should return ${field} from test result`, () => {
                const geminiTestAdapter = new GeminiTestResultAdapter({[field]: 'some-value'});

                assert.equal(geminiTestAdapter[method](), 'some-value');
            });
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
