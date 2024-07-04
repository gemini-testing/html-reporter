import sinon, {type SinonStub} from 'sinon';
import type {TestCase, TestResult, FullProject} from '@playwright/test/reporter';

import {PlaywrightTestAdapter, type PwtRawTest} from '../../../../../lib/adapters/test/playwright';
import {PlaywrightTestResultAdapter, type PlaywrightAttachment} from '../../../../../lib/adapters/test-result/playwright';
import {TestStatus, UNKNOWN_ATTEMPT} from '../../../../../lib/constants';
import type {ImageDiffError} from '../../../../../lib/errors';

describe('lib/adapters/test/playwright', () => {
    const sandbox = sinon.createSandbox();

    const mkTest_ = (opts: Partial<PwtRawTest> = {}): PwtRawTest => ({
        file: 'default-path.ts',
        browserName: 'default-bro',
        title: 'suite test',
        titlePath: ['suite', 'test'],
        ...opts
    });

    afterEach(() => sandbox.restore());

    describe('originalTest', () => {
        it('shoult return original test instance', () => {
            const test = mkTest_();

            assert.equal(PlaywrightTestAdapter.create(test).originalTest, test);
        });
    });

    describe('id', () => {
        it('should return title as "id" from original test', () => {
            const test = mkTest_({title: 'title'});

            assert.equal(PlaywrightTestAdapter.create(test).id, 'title');
        });
    });

    describe('file', () => {
        it('should return file from original test', () => {
            const test = mkTest_({file: 'some-file.ts'});

            assert.equal(PlaywrightTestAdapter.create(test).file, 'some-file.ts');
        });
    });

    describe('title', () => {
        it('should return title from original test', () => {
            const test = mkTest_({title: 'title'});

            assert.equal(PlaywrightTestAdapter.create(test).title, 'title');
        });
    });

    describe('titlePath', () => {
        it('should return titlePath from original test', () => {
            const test = mkTest_({titlePath: ['suite', 'test']});

            assert.deepEqual(PlaywrightTestAdapter.create(test).titlePath, ['suite', 'test']);
        });
    });

    (['pending', 'disabled', 'silentSkip'] as const).forEach(fieldName => {
        describe(fieldName, () => {
            it('should return false by default', () => {
                assert.isFalse(PlaywrightTestAdapter.create(mkTest_())[fieldName]);
            });
        });
    });

    (['skipReason', 'browserVersion'] as const).forEach(fieldName => {
        describe(fieldName, () => {
            it('should return empty line by default', () => {
                assert.equal(PlaywrightTestAdapter.create(mkTest_())[fieldName], '');
            });
        });
    });

    describe('browserId', () => {
        it('should return browser name from original test', () => {
            const test = mkTest_({browserName: 'yabro'});

            assert.equal(PlaywrightTestAdapter.create(test).browserId, 'yabro');
        });
    });

    describe('fullTitle', () => {
        it('should return title from original test', () => {
            const test = mkTest_({title: 'title'});

            assert.equal(PlaywrightTestAdapter.create(test).fullTitle(), 'title');
        });
    });

    describe('clone', () => {
        it('should create new pwt test with deeply clone original test', () => {
            const test = mkTest_({title: 'first'});
            const pwtTestAdapter = PlaywrightTestAdapter.create(test);

            const clonedPwtTestAdapter = pwtTestAdapter.clone();
            test.title = 'second';

            assert.notDeepEqual(clonedPwtTestAdapter.originalTest, test);
            assert.equal(clonedPwtTestAdapter.originalTest.title, 'first');
        });
    });

    describe('isSilentlySkipped', () => {
        it('should return false by default', () => {
            assert.isFalse(PlaywrightTestAdapter.create(mkTest_()).isSilentlySkipped());
        });
    });

    describe('createTestResult', () => {
        beforeEach(() => {
            sandbox.stub(PlaywrightTestResultAdapter, 'create').returns({});
        });

        it('should create test result adapter with generated test case', () => {
            const test = mkTest_({
                file: 'some-path.ts',
                browserName: 'yabro',
                title: 'suite test',
                titlePath: ['suite', 'test']
            });
            const testAdapter = PlaywrightTestAdapter.create(test);

            testAdapter.createTestResult({status: TestStatus.SUCCESS});
            const testCase = (PlaywrightTestResultAdapter.create as SinonStub).args[0][0] as unknown as TestCase;

            assert.calledOnceWith(PlaywrightTestResultAdapter.create as SinonStub, {
                titlePath: sinon.match.func,
                title: 'suite test',
                annotations: [],
                location: {
                    file: 'some-path.ts'
                },
                parent: {
                    project: sinon.match.func
                }
            }, sinon.match.any, UNKNOWN_ATTEMPT);
            assert.deepEqual(testCase.titlePath(), ['', 'yabro', 'some-path.ts', 'suite', 'test']);
            assert.deepEqual(testCase.parent.project(), {name: 'yabro'} as FullProject);
        });

        describe('generate test result', () => {
            it('should create test result adapter with generated test result', () => {
                const testAdapter = PlaywrightTestAdapter.create(mkTest_());

                testAdapter.createTestResult({status: TestStatus.SUCCESS, attempt: 100500});

                assert.calledOnceWith(PlaywrightTestResultAdapter.create as SinonStub, sinon.match.any, {
                    attachments: [],
                    status: TestStatus.SUCCESS,
                    steps: [],
                    startTime: sinon.match.date
                }, 100500);
            });

            describe('correctly handle attachments', () => {
                const refImg = {
                    path: '/root/images/ref.png',
                    relativePath: 'images/ref.png',
                    size: {
                        width: 100,
                        height: 200
                    }
                };

                it('should create test result with expected attachment', () => {
                    const testAdapter = PlaywrightTestAdapter.create(mkTest_());
                    const assertViewResult = {
                        stateName: 'plain',
                        refImg,
                        isUpdated: true
                    };

                    testAdapter.createTestResult({status: TestStatus.UPDATED, assertViewResults: [assertViewResult]});
                    const testResult = (PlaywrightTestResultAdapter.create as SinonStub).args[0][1] as unknown as TestResult;

                    assert.deepEqual(testResult.attachments as PlaywrightAttachment[], [{
                        name: 'plain-expected.png',
                        path: '/root/images/ref.png',
                        relativePath: 'images/ref.png',
                        contentType: 'image/png',
                        size: {width: 100, height: 200},
                        isUpdated: true
                    }]);
                });

                it('should create test result with actual attachment', () => {
                    const testAdapter = PlaywrightTestAdapter.create(mkTest_());
                    const assertViewResult = {
                        stateName: 'plain',
                        refImg,
                        currImg: {
                            path: '/root/images/actual.png',
                            size: {
                                width: 100,
                                height: 200
                            }
                        },
                        isUpdated: false
                    } as unknown as ImageDiffError;

                    testAdapter.createTestResult({status: TestStatus.FAIL, assertViewResults: [assertViewResult]});
                    const testResult = (PlaywrightTestResultAdapter.create as SinonStub).args[0][1] as unknown as TestResult;

                    assert.deepEqual(testResult.attachments[1] as PlaywrightAttachment, {
                        name: 'plain-actual.png',
                        path: '/root/images/actual.png',
                        contentType: 'image/png',
                        size: {width: 100, height: 200},
                        isUpdated: false
                    });
                });

                it('should create test result with actual attachment', () => {
                    const testAdapter = PlaywrightTestAdapter.create(mkTest_());
                    const assertViewResult = {
                        stateName: 'plain',
                        refImg,
                        currImg: {
                            path: '/root/images/actual.png',
                            size: {
                                width: 100,
                                height: 200
                            }
                        },
                        isUpdated: false
                    } as unknown as ImageDiffError;

                    testAdapter.createTestResult({status: TestStatus.FAIL, assertViewResults: [assertViewResult]});
                    const testResult = (PlaywrightTestResultAdapter.create as SinonStub).args[0][1] as unknown as TestResult;

                    assert.deepEqual(testResult.attachments[1] as PlaywrightAttachment, {
                        name: 'plain-actual.png',
                        path: '/root/images/actual.png',
                        contentType: 'image/png',
                        size: {width: 100, height: 200},
                        isUpdated: false
                    });
                });

                it('should create test result with diff attachment', () => {
                    const testAdapter = PlaywrightTestAdapter.create(mkTest_());
                    const assertViewResult = {
                        stateName: 'plain',
                        refImg,
                        diffImg: {
                            path: '/root/images/diff.png',
                            size: {
                                width: 100,
                                height: 200
                            }
                        },
                        isUpdated: false
                    } as unknown as ImageDiffError;

                    testAdapter.createTestResult({status: TestStatus.FAIL, assertViewResults: [assertViewResult]});
                    const testResult = (PlaywrightTestResultAdapter.create as SinonStub).args[0][1] as unknown as TestResult;

                    assert.deepEqual(testResult.attachments[1] as PlaywrightAttachment, {
                        name: 'plain-diff.png',
                        path: '/root/images/diff.png',
                        contentType: 'image/png',
                        size: {width: 100, height: 200},
                        isUpdated: false
                    });
                });
            });
        });
    });
});
