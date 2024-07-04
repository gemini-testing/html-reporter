import type {Test} from 'testplane';
import sinon, {type SinonStub} from 'sinon';
import {TestplaneTestAdapter} from '../../../../../lib/adapters/test/testplane';
import {TestplaneTestResultAdapter} from '../../../../../lib/adapters/test-result/testplane';
import {mkState} from '../../../utils';
import {TestStatus} from '../../../../../lib/constants';

describe('lib/adapters/test/testplane', () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => sandbox.restore());

    describe('originalTest', () => {
        it('shoult return original test instance', () => {
            const test = mkState() as unknown as Test;

            assert.equal(TestplaneTestAdapter.create(test).originalTest, test);
        });
    });

    describe('id', () => {
        it('should return id from original test', () => {
            const test = mkState({id: 'foo'}) as unknown as Test;

            assert.equal(TestplaneTestAdapter.create(test).id, 'foo');
        });
    });

    describe('pending', () => {
        it('should return pending from original test', () => {
            const test = mkState({pending: true}) as unknown as Test;

            assert.isTrue(TestplaneTestAdapter.create(test).pending);
        });
    });

    describe('disabled', () => {
        it('should return disabled from original test', () => {
            const test = mkState({disabled: true}) as unknown as Test;

            assert.isTrue(TestplaneTestAdapter.create(test).disabled);
        });
    });

    describe('browserId', () => {
        it('should return browserId from original test', () => {
            const test = mkState({browserId: 'yabro'}) as unknown as Test;

            assert.equal(TestplaneTestAdapter.create(test).browserId, 'yabro');
        });
    });

    describe('fullTitle', () => {
        it('should return full title from original test', () => {
            const test = mkState({fullTitle: () => 'suite test'}) as unknown as Test;

            assert.equal(TestplaneTestAdapter.create(test).fullTitle(), 'suite test');
        });
    });

    describe('clone', () => {
        it('should return new test adapter instance with cloned original test instance', () => {
            const clonedTest = mkState();
            const clonedTestAdapter = {} as unknown as TestplaneTestAdapter;
            const test = mkState({clone: () => clonedTest}) as unknown as Test;
            const testAdapter = TestplaneTestAdapter.create(test);

            sandbox.stub(TestplaneTestAdapter, 'create').returns(clonedTestAdapter);

            assert.equal(testAdapter.clone(), clonedTestAdapter);
            assert.calledOnceWith(TestplaneTestAdapter.create as SinonStub, clonedTest);
        });
    });

    describe('isSilentlySkipped', () => {
        it('should return false if test and parent is not silently skipped', () => {
            const test = mkState({
                silentSkip: false,
                parent: {
                    silentSkip: false
                }
            }) as unknown as Test;

            assert.isFalse(TestplaneTestAdapter.create(test).isSilentlySkipped());
        });

        describe('should return true', () => {
            it('if test is silently skipped', () => {
                const test = mkState({silentSkip: true}) as unknown as Test;

                assert.isTrue(TestplaneTestAdapter.create(test).isSilentlySkipped());
            });

            it('if test parent is silently skipped', () => {
                const test = mkState({
                    silentSkip: false,
                    parent: {
                        silentSkip: true
                    }
                }) as unknown as Test;

                assert.isTrue(TestplaneTestAdapter.create(test).isSilentlySkipped());
            });
        });
    });

    describe('createTestResult', () => {
        it('should return testplane test result adapter', () => {
            const testResultAdapter = {} as unknown as TestplaneTestResultAdapter;
            const clonedTest = mkState();
            const test = mkState({clone: () => clonedTest}) as unknown as Test;
            const status = TestStatus.SUCCESS;
            const attempt = 0;
            sandbox.stub(TestplaneTestResultAdapter, 'create').withArgs(clonedTest, {status, attempt}).returns(testResultAdapter);

            const formattedTestResult = TestplaneTestAdapter.create(test).createTestResult({status, attempt});

            assert.equal(formattedTestResult, testResultAdapter);
            assert.calledOnceWith(TestplaneTestResultAdapter.create as SinonStub, clonedTest, {status, attempt});
        });
    });
});
