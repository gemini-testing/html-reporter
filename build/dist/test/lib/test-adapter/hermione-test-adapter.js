'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var _ = require('lodash');
var HermioneTestResultAdapter = require('../../../lib/test-adapter/hermione-test-adapter');
var _a = require('../../utils'), stubTool = _a.stubTool, stubConfig = _a.stubConfig;
describe('hermione test adapter', function () {
    var sandbox = sinon.sandbox.create();
    var ImageDiffError = /** @class */ (function (_super) {
        __extends(ImageDiffError, _super);
        function ImageDiffError() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return ImageDiffError;
    }(Error));
    var NoRefImageError = /** @class */ (function (_super) {
        __extends(NoRefImageError, _super);
        function NoRefImageError() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return NoRefImageError;
    }(Error));
    var mkHermioneTestResultAdapter = function (testResult, toolOpts) {
        if (toolOpts === void 0) { toolOpts = {}; }
        var config = _.defaults(toolOpts.config, {
            browsers: {
                bro: {}
            }
        });
        var tool = stubTool(stubConfig(config), {}, { ImageDiffError: ImageDiffError, NoRefImageError: NoRefImageError });
        return new HermioneTestResultAdapter(testResult, tool);
    };
    afterEach(function () { return sandbox.restore(); });
    it('should return suite attempt', function () {
        var testResult = { retriesLeft: 0, browserId: 'bro' };
        var config = {
            retry: 0,
            browsers: {
                bro: { retry: 5 }
            }
        };
        var hermioneTestAdapter = mkHermioneTestResultAdapter(testResult, { config: config });
        assert.equal(hermioneTestAdapter.attempt, 4);
    });
    it('should return test error with "message", "stack" and "stateName"', function () {
        var testResult = {
            err: {
                message: 'some-message', stack: 'some-stack', stateName: 'some-test', foo: 'bar'
            }
        };
        var hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);
        assert.deepEqual(hermioneTestAdapter.error, {
            message: 'some-message',
            stack: 'some-stack',
            stateName: 'some-test'
        });
    });
    it('should return test state', function () {
        var testResult = { title: 'some-test' };
        var hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);
        assert.deepEqual(hermioneTestAdapter.state, { name: 'some-test' });
    });
    it('should return assert view results', function () {
        var testResult = { assertViewResults: [1] };
        var hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);
        assert.deepEqual(hermioneTestAdapter.assertViewResults, [1]);
    });
    describe('hasDiff()', function () {
        it('should return true if test has image diff errors', function () {
            var testResult = { assertViewResults: [new ImageDiffError()] };
            var hermioneTestAdapter = mkHermioneTestResultAdapter(testResult, { errors: { ImageDiffError: ImageDiffError } });
            assert.isTrue(hermioneTestAdapter.hasDiff());
        });
        it('should return false if test has not image diff errors', function () {
            var testResult = { assertViewResults: [new Error()] };
            var hermioneTestAdapter = mkHermioneTestResultAdapter(testResult, { errors: { ImageDiffError: ImageDiffError } });
            assert.isFalse(hermioneTestAdapter.hasDiff());
        });
    });
    it('should return image dir', function () {
        var testResult = { id: function () { return 'some-id'; } };
        var hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);
        assert.deepEqual(hermioneTestAdapter.imageDir, 'some-id');
    });
    it('should return description', function () {
        var testResult = { description: 'some-description' };
        var hermioneTestAdapter = mkHermioneTestResultAdapter(testResult);
        assert.deepEqual(hermioneTestAdapter.description, 'some-description');
    });
    describe('prepareTestResult()', function () {
        it('should return correct "name" field', function () {
            var testResult = {
                root: true,
                title: 'some-title'
            };
            var result = mkHermioneTestResultAdapter(testResult).prepareTestResult();
            assert.propertyVal(result, 'name', 'some-title');
        });
        it('should return correct "suitePath" field', function () {
            var parentSuite = { parent: { root: true }, title: 'root-title' };
            var testResult = {
                parent: parentSuite,
                title: 'some-title'
            };
            var result = mkHermioneTestResultAdapter(testResult).prepareTestResult();
            assert.deepEqual(result.suitePath, ['root-title', 'some-title']);
        });
        it('should return "browserId" field as is', function () {
            var testResult = {
                root: true,
                browserId: 'bro'
            };
            var result = mkHermioneTestResultAdapter(testResult).prepareTestResult();
            assert.propertyVal(result, 'browserId', 'bro');
        });
    });
    describe('getImagesInfo()', function () {
        var mkTestResult_ = function (result) { return _.defaults(result, { id: function () { return 'some-id'; } }); };
        it('should not reinit "imagesInfo"', function () {
            var testResult = mkTestResult_({ imagesInfo: [1, 2] });
            mkHermioneTestResultAdapter(testResult).getImagesInfo();
            assert.deepEqual(testResult.imagesInfo, [1, 2]);
        });
        it('should reinit "imagesInfo" if it was empty', function () {
            var testResult = mkTestResult_({ assertViewResults: [1], imagesInfo: [] });
            mkHermioneTestResultAdapter(testResult).getImagesInfo();
            assert.lengthOf(testResult.imagesInfo, 1);
        });
    });
});
//# sourceMappingURL=hermione-test-adapter.js.map