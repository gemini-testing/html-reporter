'use strict';

const path = require('path');
const fs = require('fs-extra');
const utils = require('../../lib/server-utils');

describe('server-utils', () => {
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

                assert.equal(resultPath, path.join('images', 'some', 'dir', `bro~${testData.prefix}_2.png`));
            });

            it('should add default attempt if it does not exist from test', () => {
                const test = {
                    imageDir: 'some/dir',
                    browserId: 'bro'
                };

                const resultPath = utils[`get${testData.name}Path`](test);

                assert.equal(resultPath, path.join('images', 'some', 'dir', `bro~${testData.prefix}_0.png`));
            });

            it('should add state name to the path if it was passed', () => {
                const test = {
                    imageDir: 'some/dir',
                    browserId: 'bro'
                };

                const resultPath = utils[`get${testData.name}Path`](test, 'plain');

                assert.equal(resultPath, path.join('images', 'some', 'dir', `plain/bro~${testData.prefix}_0.png`));
            });
        });

        describe(`get${testData.name}AbsolutePath`, () => {
            const sandbox = sinon.sandbox.create();

            beforeEach(() => {
                sandbox.stub(process, 'cwd').returns('/root');
            });

            afterEach(() => sandbox.restore());

            it('should generate correct absolute path for test image', () => {
                const test = {
                    imageDir: 'some/dir',
                    browserId: 'bro'
                };

                const resultPath = utils[`get${testData.name}AbsolutePath`](test, 'reportPath');

                assert.equal(resultPath, path.join('/root', 'reportPath', 'images', 'some', 'dir', `bro~${testData.prefix}_0.png`));
            });

            it('should add state name to the path if it was passed', () => {
                const test = {
                    imageDir: 'some/dir',
                    browserId: 'bro'
                };

                const resultPath = utils[`get${testData.name}AbsolutePath`](test, 'reportPath', 'plain');

                assert.equal(resultPath, path.join('/root', 'reportPath', 'images', 'some', 'dir', 'plain', `bro~${testData.prefix}_0.png`));
            });
        });
    });

    describe('prepareCommonJSData', () => {
        const sandbox = sinon.sandbox.create();

        afterEach(() => sandbox.restore());

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
        const sandbox = sinon.sandbox.create();

        beforeEach(() => {
            sandbox.stub(fs, 'copy').resolves();
            sandbox.stub(fs, 'mkdirs').resolves();
        });

        afterEach(() => sandbox.restore());

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

    describe('browser/commands/assert-view/capture-processors/save-diff', () => {
        const sandbox = sinon.createSandbox();

        const curPath = '/curPath.png';
        const refPath = '/refPath.png';
        const diffPath = '/diffPath.png';

        let cache;
        let workers;

        const mkImageDiffError = () => {
            return {
                currImg: {
                    path: curPath
                },
                refImg: {
                    path: refPath
                }
            };
        };

        beforeEach(() => {
            cache = new Map();

            workers = {
                exec: sandbox.stub().resolves()
            };
            sandbox.stub(fs, 'readFile');
            sandbox.stub(fs, 'copy');

            fs.readFile.withArgs(curPath).resolves(Buffer.from('currentContent'));
            fs.readFile.withArgs(refPath).resolves(Buffer.from('referenceContent'));
        });

        afterEach(() => sandbox.restore());

        it('should get result from cache for second call if data not changed', async () => {
            await utils.saveDiffInWorker(workers, mkImageDiffError(), '/firstDiffPath.png', cache);
            await utils.saveDiffInWorker(workers, mkImageDiffError(), diffPath, cache);

            assert.calledOnceWith(
                workers.exec,
                'saveDiffTo',
                sinon.match(mkImageDiffError()),
                '/firstDiffPath.png'
            );
            assert.calledOnceWith(
                fs.copy,
                '/firstDiffPath.png',
                diffPath,
            );
        });

        it('should build diff for second call if current image changed ', async () => {
            await utils.saveDiffInWorker(workers, mkImageDiffError(), '/firstDiffPath.png', cache);

            fs.readFile.withArgs(curPath).resolves(Buffer.from('changedCurrentContent'));

            await utils.saveDiffInWorker(workers, mkImageDiffError(), diffPath, cache);

            assert.calledTwice(workers.exec);
            assert.calledWith(
                workers.exec,
                'saveDiffTo',
                sinon.match(mkImageDiffError()),
                diffPath
            );
        });

        it('should build diff for second call if reference image changed ', async () => {
            await utils.saveDiffInWorker(workers, mkImageDiffError(), '/firstDiffPath.png', cache);

            fs.readFile.withArgs(refPath).resolves(Buffer.from('changedReferenceContent'));

            await utils.saveDiffInWorker(workers, mkImageDiffError(), diffPath, cache);

            assert.calledTwice(workers.exec);
            assert.calledWith(
                workers.exec,
                'saveDiffTo',
                sinon.match(mkImageDiffError()),
                diffPath
            );
        });
    });
});
