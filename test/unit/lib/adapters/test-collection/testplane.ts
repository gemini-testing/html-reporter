import type {TestCollection} from 'testplane';
import sinon from 'sinon';
import {TestplaneTestCollectionAdapter} from '../../../../../lib/adapters/test-collection/testplane';
import {TestplaneTestAdapter} from '../../../../../lib/adapters/test/testplane';
import {stubTestCollection, mkState} from '../../../utils';

describe('lib/adapters/test-collection/testplane', () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => sandbox.restore());

    describe('original', () => {
        it('shoult return original test instance', () => {
            const testCollection = stubTestCollection() as TestCollection;

            assert.equal(TestplaneTestCollectionAdapter.create(testCollection).original, testCollection);
        });
    });

    describe('tests', () => {
        it('should return tests', () => {
            const test1 = mkState();
            const testAdapter1 = {} as TestplaneTestAdapter;
            const test2 = mkState();
            const testAdapter2 = {} as TestplaneTestAdapter;

            sandbox.stub(TestplaneTestAdapter, 'create')
                .withArgs(test1).returns(testAdapter1)
                .withArgs(test2).returns(testAdapter2);

            const testCollection = stubTestCollection({yabro1: test1, yabro2: test2}) as TestCollection;
            const testCollectionAdapter = TestplaneTestCollectionAdapter.create(testCollection);

            assert.deepEqual(testCollectionAdapter.tests, [testAdapter1, testAdapter2]);
        });
    });
});
