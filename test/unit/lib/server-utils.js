'use strict';

const path = require('path');
const fs = require('fs-extra');
const utils = require('lib/server-utils');
const {IMAGES_PATH} = require('lib/constants/paths');

describe('server-utils', () => {
    const sandbox = sinon.sandbox.create();

    afterEach(() => sandbox.restore());

    [
        {name: 'Reference', prefix: 'ref'},
        {name: 'Current', prefix: 'current'},
        {name: 'Diff', prefix: 'diff'}
    ].forEach((testData) => {
        describe(`get${testData.name}Path`, () => {
            it('should generate correct reference path for test image', () => {
                const test = {
                    imageDir: 'some/dir',
                    browserId: 'bro',
                    attempt: 2
                };

                const resultPath = utils[`get${testData.name}Path`](test);

                assert.equal(resultPath, path.join(IMAGES_PATH, 'some', 'dir', `bro~${testData.prefix}_2.png`));
            });

            it('should add default attempt if it does not exist from test', () => {
                const test = {
                    imageDir: 'some/dir',
                    browserId: 'bro'
                };

                const resultPath = utils[`get${testData.name}Path`](test);

                assert.equal(resultPath, path.join(IMAGES_PATH, 'some', 'dir', `bro~${testData.prefix}_0.png`));
            });

            it('should add state name to the path if it was passed', () => {
                const test = {
                    imageDir: 'some/dir',
                    browserId: 'bro'
                };

                const resultPath = utils[`get${testData.name}Path`](test, 'plain');

                assert.equal(resultPath, path.join(IMAGES_PATH, 'some', 'dir', `plain/bro~${testData.prefix}_0.png`));
            });
        });

        describe(`get${testData.name}AbsolutePath`, () => {
            beforeEach(() => {
                sandbox.stub(process, 'cwd').returns('/root');
            });

            it('should generate correct absolute path for test image', () => {
                const test = {
                    imageDir: 'some/dir',
                    browserId: 'bro'
                };

                const resultPath = utils[`get${testData.name}AbsolutePath`](test, 'reportPath');

                assert.equal(resultPath, path.join('/root', 'reportPath', IMAGES_PATH, 'some', 'dir', `bro~${testData.prefix}_0.png`));
            });

            it('should add state name to the path if it was passed', () => {
                const test = {
                    imageDir: 'some/dir',
                    browserId: 'bro'
                };

                const resultPath = utils[`get${testData.name}AbsolutePath`](test, 'reportPath', 'plain');

                assert.equal(resultPath, path.join('/root', 'reportPath', IMAGES_PATH, 'some', 'dir', 'plain', `bro~${testData.prefix}_0.png`));
            });
        });
    });

    describe('prepareCommonJSData', () => {
        it('should wrap passed data with commonjs wrapper', () => {
            const result = utils.prepareCommonJSData({some: 'data'});

            const expectedData = 'var data = {"some":"data"};\n'
                + 'try { module.exports = data; } catch(e) {}';

            assert.equal(result, expectedData);
        });

        it('should stringify passed data', () => {
            sandbox.stub(JSON, 'stringify');

            utils.prepareCommonJSData({some: 'data'});

            assert.calledOnceWith(JSON.stringify, {some: 'data'});
        });
    });

    describe('copyImageAsync', () => {
        beforeEach(() => {
            sandbox.stub(fs, 'copy').resolves();
            sandbox.stub(fs, 'mkdirs').resolves();
        });

        it('should create directory and copy image', () => {
            const fromPath = '/from/image.png',
                toPath = '/to/image.png';

            return utils.copyImageAsync(fromPath, toPath)
                .then(() => {
                    assert.calledWithMatch(fs.mkdirs, '/to');
                    assert.calledWithMatch(fs.copy, fromPath, toPath);
                });
        });
    });

    describe('getDetailsFileName', () => {
        it('should compose correct file name from suite path, browser id and attempt', () => {
            sandbox.stub(Date, 'now').returns('123456789');
            const testId = 'abcdef';
            const expected = `${testId}-bro_2_123456789.json`;

            assert.equal(utils.getDetailsFileName(testId, 'bro', 1), expected);
        });
    });
});
