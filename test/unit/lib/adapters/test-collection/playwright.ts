import sinon from 'sinon';
import {PlaywrightTestCollectionAdapter} from '../../../../../lib/adapters/test-collection/playwright';
import {PlaywrightTestAdapter, type PwtRawTest} from '../../../../../lib/adapters/test/playwright';

describe('lib/adapters/test-collection/playwright', () => {
    const sandbox = sinon.createSandbox();

    const mkTest_ = (opts: Partial<PwtRawTest> = {}): PwtRawTest => ({
        file: 'default-path.ts',
        browserName: 'default-bro',
        title: 'suite test',
        titlePath: ['suite', 'test'],
        ...opts
    });

    afterEach(() => sandbox.restore());

    describe('tests', () => {
        it('should return tests', () => {
            const test1 = mkTest_({browserName: 'yabro1'});
            const testAdapter1 = {} as PlaywrightTestAdapter;
            const test2 = mkTest_({browserName: 'yabro2'});
            const testAdapter2 = {} as PlaywrightTestAdapter;

            sandbox.stub(PlaywrightTestAdapter, 'create')
                .withArgs(test1).returns(testAdapter1)
                .withArgs(test2).returns(testAdapter2);

            const testCollectionAdapter = PlaywrightTestCollectionAdapter.create([test1, test2]);

            assert.deepEqual(testCollectionAdapter.tests, [testAdapter1, testAdapter2]);
        });
    });
});
