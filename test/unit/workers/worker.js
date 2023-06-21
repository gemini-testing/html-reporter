const looksSame = require('looks-same');
const worker = require('src/workers/worker');

describe('worker', () => {
    const sandbox = sinon.createSandbox();

    beforeEach(() => {
        sandbox.stub(looksSame, 'createDiff').resolves();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('saveDiffTo', () => {
        it('should pass diff path as a diff option to looks-same', async () => {
            await worker.saveDiffTo({diffOpts: {}}, 'foo/bar');

            assert.calledWith(looksSame.createDiff, sinon.match({diff: 'foo/bar'}));
        });

        it('should pass diffColor option as a highlightColor option to looks-same', async () => {
            await worker.saveDiffTo({
                diffOpts: {diffColor: '#foobar'}
            });

            assert.calledWith(looksSame.createDiff, sinon.match({highlightColor: '#foobar'}));
        });

        it('should pass through other diff options to looks-same', async () => {
            await worker.saveDiffTo({
                diffOpts: {foo: 'bar', baz: 'qux'}
            });

            assert.calledWith(looksSame.createDiff, sinon.match({foo: 'bar', baz: 'qux'}));
        });

        it('should resolve with looks-same result', async () => {
            looksSame.createDiff.resolves({foo: 'bar'});

            const result = await worker.saveDiffTo({diffOpts: {}});

            assert.deepEqual(result, {foo: 'bar'});
        });

        it('should reject with looks-same error', async () => {
            looksSame.createDiff.rejects(new Error('fooBar'));

            const resPromise = worker.saveDiffTo({diffOpts: {}});

            await assert.isRejected(resPromise, Error, 'fooBar');
        });
    });
});
