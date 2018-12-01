'use strict';

const _ = require('lodash');
const HermioneTestResultAdapter = require('lib/test-adapter/hermione-test-adapter');
const {stubTool, stubConfig} = require('../../utils');

describe('hermione test adapter', () => {
    const sandbox = sinon.sandbox.create();

    class ImageDiffError extends Error {}
    class NoRefImageError extends Error {}

    const mkHermioneTestResultAdapter = (testResult, toolOpts = {}) => {
        const config = _.defaults(toolOpts.config, {
            browsers: {
                bro: {}
            }
        });
        const tool = stubTool(stubConfig(config), {}, {ImageDiffError, NoRefImageError});

        return new HermioneTestResultAdapter(testResult, tool);
    };

    afterEach(() => sandbox.restore());

    it('should return suite attempt', () => {
        const testResult = {retriesLeft: 0, browserId: 'bro'};
        const config = {
            retry: 0,
            browsers: {
                bro: {retry: 5}
            }
        };

        const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult, {config});

        assert.equal(hermioneTestAdapter.attempt, 4);
    });

    it('should return test error with "message", "stack" and "stateName"', () => {
        const testResult = {
            err: {
                message: 'some-message', stack: 'some-stack', stateName: 'some-test', foo: 'bar'
            }
        };

        const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

        assert.deepEqual(hermioneTestAdapter.error, {
            message: 'some-message',
            stack: 'some-stack',
            stateName: 'some-test'
        });
    });

    it('should return test state', () => {
        const testResult = {title: 'some-test'};

        const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

        assert.deepEqual(hermioneTestAdapter.state, {name: 'some-test'});
    });

    it('should return assert view results', () => {
        const testResult = {assertViewResults: [1]};

        const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

        assert.deepEqual(hermioneTestAdapter.assertViewResults, [1]);
    });

    describe('hasDiff()', () => {
        it('should return true if test has image diff errors', () => {
            const testResult = {assertViewResults: [new ImageDiffError()]};

            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult, {errors: {ImageDiffError}});

            assert.isTrue(hermioneTestAdapter.hasDiff());
        });

        it('should return false if test has not image diff errors', () => {
            const testResult = {assertViewResults: [new Error()]};

            const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult, {errors: {ImageDiffError}});

            assert.isFalse(hermioneTestAdapter.hasDiff());
        });
    });

    it('should return image dir', () => {
        const testResult = {id: () => 'some-id'};

        const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

        assert.deepEqual(hermioneTestAdapter.imageDir, 'some-id');
    });

    it('should return description', () => {
        const testResult = {description: 'some-description'};

        const hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);

        assert.deepEqual(hermioneTestAdapter.description, 'some-description');
    });

    describe('prepareTestResult()', () => {
        it('should return correct "name" field', () => {
            const testResult = {
                root: true,
                title: 'some-title'
            };

            const result = mkHermioneTestResultAdapter(testResult).prepareTestResult();

            assert.propertyVal(result, 'name', 'some-title');
        });

        it('should return correct "suitePath" field', () => {
            const parentSuite = {parent: {root: true}, title: 'root-title'};
            const testResult = {
                parent: parentSuite,
                title: 'some-title'
            };

            const result = mkHermioneTestResultAdapter(testResult).prepareTestResult();

            assert.deepEqual(result.suitePath, ['root-title', 'some-title']);
        });

        it('should return "browserId" field as is', () => {
            const testResult = {
                root: true,
                browserId: 'bro'
            };

            const result = mkHermioneTestResultAdapter(testResult).prepareTestResult();

            assert.propertyVal(result, 'browserId', 'bro');
        });
    });

    describe('getImagesInfo()', () => {
        const mkTestResult_ = (result) => _.defaults(result, {id: () => 'some-id'});

        it('should not reinit "imagesInfo"', () => {
            const testResult = mkTestResult_({imagesInfo: [1, 2]});

            mkHermioneTestResultAdapter(testResult).getImagesInfo();

            assert.deepEqual(testResult.imagesInfo, [1, 2]);
        });

        it('should reinit "imagesInfo" if it was empty', () => {
            const testResult = mkTestResult_({assertViewResults: [1], imagesInfo: []});

            mkHermioneTestResultAdapter(testResult).getImagesInfo();

            assert.lengthOf(testResult.imagesInfo, 1);
        });
    });
});
