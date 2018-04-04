'use strict';

const HermioneTestResultAdapter = require('../../../lib/test-adapter/hermione-test-adapter');
const {stubConfig} = require('../../utils');

describe('hermione test adapter', () => {
    const sandbox = sinon.sandbox.create();

    afterEach(() => sandbox.restore());

    it('should return suite attempt', () => {
        const testResult = {retriesLeft: 0, browserId: 'bro'};
        const config = stubConfig({
            bro: {retry: 5}
        });

        const hermioneTestAdapter = new HermioneTestResultAdapter(testResult, config);

        assert.equal(hermioneTestAdapter.attempt, 4);
    });

    it('should return test error with "message", "stack" and "stateName"', () => {
        const testResult = {
            err: {
                message: 'some-message', stack: 'some-stack', stateName: 'some-test', foo: 'bar'
            }
        };

        const hermioneTestAdapter = new HermioneTestResultAdapter(testResult);

        assert.deepEqual(hermioneTestAdapter.error, {
            message: 'some-message',
            stack: 'some-stack',
            stateName: 'some-test'
        });
    });

    it('should return test state', () => {
        const testResult = {title: 'some-test'};

        const hermioneTestAdapter = new HermioneTestResultAdapter(testResult);

        assert.deepEqual(hermioneTestAdapter.state, {name: 'some-test'});
    });

    it('should return reference path', () => {
        const testResult = {err: {refImagePath: 'some-ref-path'}};

        const hermioneTestAdapter = new HermioneTestResultAdapter(testResult);

        assert.deepEqual(hermioneTestAdapter.referencePath, 'some-ref-path');
    });

    it('should return current path', () => {
        const testResult = {err: {currentImagePath: 'some-current-path'}};

        const hermioneTestAdapter = new HermioneTestResultAdapter(testResult);

        assert.deepEqual(hermioneTestAdapter.currentPath, 'some-current-path');
    });

    it('should return image dir', () => {
        const testResult = {id: () => 'some-id'};

        const hermioneTestAdapter = new HermioneTestResultAdapter(testResult);

        assert.deepEqual(hermioneTestAdapter.imageDir, 'some-id');
    });

    it('should return description', () => {
        const testResult = {description: 'some-description'};

        const hermioneTestAdapter = new HermioneTestResultAdapter(testResult);

        assert.deepEqual(hermioneTestAdapter.description, 'some-description');
    });
});
