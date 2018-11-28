'use strict';
var utils = require('../../lib/server-utils');
describe('server-utils', function () {
    [
        { name: 'Reference', prefix: 'ref' },
        { name: 'Current', prefix: 'current' },
        { name: 'Diff', prefix: 'diff' }
    ].forEach(function (testData) {
        describe("get" + testData.name + "Path", function () {
            it('should generate correct reference path for test image', function () {
                var test = {
                    imageDir: 'some/dir',
                    browserId: 'bro',
                    attempt: 2
                };
                var resultPath = utils["get" + testData.name + "Path"](test);
                assert.equal(resultPath, "images/some/dir/bro~" + testData.prefix + "_2.png");
            });
            it('should add default attempt if it does not exist from test', function () {
                var test = {
                    imageDir: 'some/dir',
                    browserId: 'bro'
                };
                var resultPath = utils["get" + testData.name + "Path"](test);
                assert.equal(resultPath, "images/some/dir/bro~" + testData.prefix + "_0.png");
            });
            it('should add state name to the path if it was passed', function () {
                var test = {
                    imageDir: 'some/dir',
                    browserId: 'bro'
                };
                var resultPath = utils["get" + testData.name + "Path"](test, 'plain');
                assert.equal(resultPath, "images/some/dir/plain/bro~" + testData.prefix + "_0.png");
            });
        });
        describe("get" + testData.name + "AbsolutePath", function () {
            var sandbox = sinon.sandbox.create();
            beforeEach(function () {
                sandbox.stub(process, 'cwd').returns('/root');
            });
            afterEach(function () { return sandbox.restore(); });
            it('should generate correct absolute path for test image', function () {
                var test = {
                    imageDir: 'some/dir',
                    browserId: 'bro'
                };
                var resultPath = utils["get" + testData.name + "AbsolutePath"](test, 'reportPath');
                assert.equal(resultPath, "/root/reportPath/images/some/dir/bro~" + testData.prefix + "_0.png");
            });
            it('should add state name to the path if it was passed', function () {
                var test = {
                    imageDir: 'some/dir',
                    browserId: 'bro'
                };
                var resultPath = utils["get" + testData.name + "AbsolutePath"](test, 'reportPath', 'plain');
                assert.equal(resultPath, "/root/reportPath/images/some/dir/plain/bro~" + testData.prefix + "_0.png");
            });
        });
    });
    describe('prepareCommonJSData', function () {
        var sandbox = sinon.sandbox.create();
        afterEach(function () { return sandbox.restore(); });
        it('should wrap passed data with commonjs wrapper', function () {
            var result = utils.prepareCommonJSData({ some: 'data' });
            var expectedData = 'var data = {"some":"data"};\n'
                + 'try { module.exports = data; } catch(e) {}';
            assert.equal(result, expectedData);
        });
        it('should stringify passed data', function () {
            sandbox.stub(JSON, 'stringify');
            utils.prepareCommonJSData({ some: 'data' });
            assert.calledOnceWith(JSON.stringify, { some: 'data' });
        });
    });
});
//# sourceMappingURL=server-utils.js.map