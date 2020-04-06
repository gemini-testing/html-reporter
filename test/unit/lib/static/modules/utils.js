'use strict';

const utils = require('lib/static/modules/utils');
const {
    IDLE,
    FAIL,
    ERROR,
    SKIPPED,
    SUCCESS
} = require('lib/constants/test-statuses');
const {
    NO_REF_IMAGE_ERROR
} = require('lib/constants/errors').getCommonErrors();
const {
    mkSuite,
    mkState,
    mkBrowserResult
} = require('../../../utils');

describe('static/modules/utils', () => {
    describe('hasFails', () => {
        describe('should return true for node if', () => {
            const mkNode_ = ({imageStatus = SUCCESS, status = SUCCESS}) => {
                return {
                    result: {
                        imagesInfo: [{status: SUCCESS}, {status: SUCCESS}, {status: imageStatus}],
                        status
                    }
                };
            };

            it('at least one image is with failed status', () => {
                const node = mkNode_({imageStatus: FAIL});

                assert.isTrue(utils.hasFails(node));
            });

            it('at least one image is with errored status', () => {
                const node = mkNode_({imageStatus: ERROR});

                assert.isTrue(utils.hasFails(node));
            });

            it('no images with failed or errored statuses but test is failed', () => {
                const node = mkNode_({status: FAIL});

                assert.isTrue(utils.hasFails(node));
            });

            it('no images with failed or errored statuses but test is errored', () => {
                const node = mkNode_({status: ERROR});

                assert.isTrue(utils.hasFails(node));
            });
        });

        describe('should return true for node with good result (no fail or error status) if', () => {
            const mkNode_ = (key, {imageStatus = SUCCESS, status = SUCCESS}) => {
                const goodResult = {
                    result: {
                        imagesInfo: [{status: SUCCESS}, {status: SUCCESS}, {status: SUCCESS}],
                        status: SUCCESS
                    }
                };

                return {
                    ...goodResult,
                    [key]: [
                        {...goodResult},
                        {
                            result: {
                                imagesInfo: [{status: SUCCESS}, {status: SUCCESS}, {status: imageStatus}],
                                status
                            }
                        },
                        {...goodResult}
                    ]
                };
            };

            it('at least one image in browsers of node is with failed status', () => {
                const node = mkNode_('browsers', {imageStatus: FAIL});

                assert.isTrue(utils.hasFails(node));
            });

            it('at least one image in children of node is with failed status', () => {
                const node = mkNode_('children', {imageStatus: FAIL});

                assert.isTrue(utils.hasFails(node));
            });

            it('at least one image in browsers is with errored status', () => {
                const node = mkNode_('browsers', {imageStatus: ERROR});

                assert.isTrue(utils.hasFails(node));
            });

            it('at least one image in children is with errored status', () => {
                const node = mkNode_('children', {imageStatus: ERROR});

                assert.isTrue(utils.hasFails(node));
            });

            it('in browsers no images with failed or errored statuses but test is failed', () => {
                const node = mkNode_('browsers', {status: FAIL});

                assert.isTrue(utils.hasFails(node));
            });

            it('in children no images with failed or errored statuses but test is failed', () => {
                const node = mkNode_('children', {status: FAIL});

                assert.isTrue(utils.hasFails(node));
            });

            it('in browsers no images with failed or errored statuses but test is errored', () => {
                const node = mkNode_('browsers', {status: ERROR});

                assert.isTrue(utils.hasFails(node));
            });

            it('in children no images with failed or errored statuses but test is errored', () => {
                const node = mkNode_('children', {status: ERROR});

                assert.isTrue(utils.hasFails(node));
            });
        });
    });

    describe('isSuiteIdle', () => {
        it('should return true for idle test', () => {
            assert.isTrue(utils.isSuiteIdle({status: IDLE}));
        });

        describe('should return false for', () => {
            it('successful test', () => {
                assert.isFalse(utils.isSuiteIdle({status: SUCCESS}));
            });

            it('failed test', () => {
                assert.isFalse(utils.isSuiteIdle({status: FAIL}));
            });

            it('errored test', () => {
                assert.isFalse(utils.isSuiteIdle({status: ERROR}));
            });
        });
    });

    describe('isSuiteSuccessful', () => {
        it('should return true for successful test', () => {
            assert.isTrue(utils.isSuiteSuccessful({status: SUCCESS}));
        });

        describe('should return false for', () => {
            it('failed test', () => {
                assert.isFalse(utils.isSuiteSuccessful({status: FAIL}));
            });

            it('errored test', () => {
                assert.isFalse(utils.isSuiteSuccessful({status: ERROR}));
            });
        });
    });

    describe('isSuiteFailed', () => {
        describe('should return true for', () => {
            it('failed test', () => {
                assert.isTrue(utils.isSuiteFailed({status: FAIL}));
            });

            it('errored test', () => {
                assert.isTrue(utils.isSuiteFailed({status: ERROR}));
            });
        });

        it('should return false for successful test', () => {
            assert.isFalse(utils.isSuiteFailed({status: SUCCESS}));
        });
    });

    describe('isAcceptable', () => {
        describe('should return true for', () => {
            it('failed test', () => {
                assert.isTrue(utils.isAcceptable({status: FAIL}));
            });

            it('skipped test', () => {
                assert.isTrue(utils.isAcceptable({status: SKIPPED}));
            });

            it('test with missing reference image', () => {
                const error = {stack: NO_REF_IMAGE_ERROR};

                assert.isTrue(utils.isAcceptable({status: ERROR, error}));
            });
        });

        describe('should return false for', () => {
            it('test with not screenshot error', () => {
                assert.isFalse(utils.isAcceptable({status: ERROR, error: {}}));
            });

            it('test with empty error', () => {
                assert.isFalse(utils.isAcceptable({status: ERROR, error: null}));
            });

            it('not failed test', () => {
                assert.isFalse(utils.isAcceptable({status: SUCCESS}));
            });
        });
    });

    describe('filterSuites', () => {
        let suites;

        beforeEach(() => {
            suites = [mkSuite({
                browsers: [
                    mkBrowserResult({name: 'first-bro'}),
                    mkBrowserResult({name: 'third-bro'})
                ],
                children: [
                    mkState({
                        browsers: [mkBrowserResult({name: 'first-bro'})]
                    }),
                    mkState({
                        browsers: [mkBrowserResult({name: 'second-bro'})]
                    })
                ]
            })];
        });

        it('should return suites as is if no browsers to filter', () => {
            assert.deepEqual(suites, utils.filterSuites(suites));
        });

        it('should return empty suites if no suites given', () => {
            assert.deepEqual([], utils.filterSuites([], ['some-bro']));
        });

        it('should filter suites by given browsers', () => {
            const filteredSuites = [mkSuite({
                browsers: [mkBrowserResult({name: 'first-bro'})],
                children: [
                    mkState({
                        browsers: [mkBrowserResult({name: 'first-bro'})]
                    })
                ]
            })];

            assert.deepEqual(filteredSuites, utils.filterSuites(suites, ['first-bro']));
        });
    });

    describe('shouldSuiteBeShown', () => {
        describe('testNameFilter', () => {
            const suite = mkSuite({
                suitePath: ['Some suite'],
                children: [
                    mkState({
                        suitePath: ['Some suite', 'test one']
                    })
                ]
            });

            it('should be true if top-level title matches', () => {
                assert.isTrue(utils.shouldSuiteBeShown({suite, testNameFilter: 'Some suite'}));
            });

            it('should be true if bottom-level title matches', () => {
                assert.isTrue(utils.shouldSuiteBeShown({suite, testNameFilter: 'test one'}));
            });

            it('should be false if no matches found', () => {
                assert.isFalse(utils.shouldSuiteBeShown({suite, testNameFilter: 'test two'}));
            });

            it('should be true if full title matches', () => {
                assert.isTrue(
                    utils.shouldSuiteBeShown({suite, testNameFilter: 'Some suite test one'})
                );
            });

            it('should be false if only part of only top-level title matches', () => {
                assert.isFalse(
                    utils.shouldSuiteBeShown({suite, testNameFilter: 'Some suite test two'})
                );
            });

            it('should be false if only part of only bottom-level title matches', () => {
                assert.isFalse(
                    utils.shouldSuiteBeShown({suite, testNameFilter: 'Another suite test one'})
                );
            });
        });

        describe('strictMatchFilter', () => {
            const suite = mkSuite({
                suitePath: ['Some suite'],
                children: [
                    mkState({
                        suitePath: ['Some suite', 'test one']
                    })
                ]
            });

            it('should be false if top-level title matches but filter is strict', () => {
                assert.isFalse(utils.shouldSuiteBeShown({suite, strictMatchFilter: true, testNameFilter: 'Some suite'}));
            });

            it('should be false if bottom-level title matches but filter is strict', () => {
                assert.isFalse(utils.shouldSuiteBeShown({suite, strictMatchFilter: true, testNameFilter: 'test one'}));
            });

            it('should be false if no matches found', () => {
                assert.isFalse(utils.shouldSuiteBeShown({suite, strictMatchFilter: true, testNameFilter: 'test two'}));
            });

            it('should be true if full title matches', () => {
                assert.isTrue(
                    utils.shouldSuiteBeShown({suite, strictMatchFilter: true, testNameFilter: 'Some suite test one'})
                );
            });

            it('should be false if only part of only top-level title matches', () => {
                assert.isFalse(
                    utils.shouldSuiteBeShown({suite, strictMatchFilter: true, testNameFilter: 'Some suite test two'})
                );
            });

            it('should be false if only part of only bottom-level title matches', () => {
                assert.isFalse(
                    utils.shouldSuiteBeShown({suite, strictMatchFilter: true, testNameFilter: 'Another suite test one'})
                );
            });
        });

        describe('errorGroupTests', () => {
            const suite = mkSuite({
                suitePath: ['Some suite'],
                children: [
                    mkState({
                        suitePath: ['Some suite', 'test one']
                    })
                ]
            });

            it('should be false if top-level title matches', () => {
                assert.isFalse(utils.shouldSuiteBeShown({suite, errorGroupTests: {'Some suite': []}}));
            });

            it('should be false if bottom-level title matches', () => {
                assert.isFalse(utils.shouldSuiteBeShown({suite, errorGroupTests: {'test one': []}}));
            });

            it('should be false if no matches found', () => {
                assert.isFalse(utils.shouldSuiteBeShown({suite, errorGroupTests: {'Some suite test two': []}}));
            });

            it('should be true if full title matches', () => {
                assert.isTrue(
                    utils.shouldSuiteBeShown({suite, errorGroupTests: {'Some suite test one': []}})
                );
            });
        });

        describe('filteredBrowsers', () => {
            const defaultSuite = mkSuite({
                children: [
                    mkState({
                        browsers: [mkBrowserResult({name: 'first-bro'})]
                    })
                ]
            });

            it('should be true if browser id is equal', () => {
                assert.isTrue(utils.shouldSuiteBeShown({suite: defaultSuite, filteredBrowsers: ['first-bro']}));
            });

            it('should be false if browser id is not a strict match', () => {
                assert.isFalse(utils.shouldSuiteBeShown({suite: defaultSuite, filteredBrowsers: ['first']}));
            });

            it('should be false if browser id is not equal', () => {
                assert.isFalse(utils.shouldSuiteBeShown({suite: defaultSuite, filteredBrowsers: ['second-bro']}));
            });

            it('should be true if browser id is equal when suite contains children and browsers', () => {
                const suite = mkSuite({
                    children: [
                        mkSuite({
                            browsers: [mkBrowserResult({name: 'first-bro'})],
                            children: [
                                mkState({
                                    browsers: [mkBrowserResult({name: 'second-bro'})]
                                })
                            ]
                        })
                    ]
                });

                assert.isTrue(utils.shouldSuiteBeShown({suite, filteredBrowsers: ['first-bro']}));
                assert.isTrue(utils.shouldSuiteBeShown({suite, filteredBrowsers: ['second-bro']}));
            });
        });
    });

    describe('getStats', () => {
        const inputStats = {
            all: {
                total: 40,
                passed: 20,
                failed: 10,
                skipped: 10,
                retries: 30
            },
            perBrowser: {
                'first-bro': {
                    total: 15,
                    passed: 10,
                    failed: 5,
                    skipped: 0,
                    retries: 10
                },
                'second-bro': {
                    total: 15,
                    passed: 5,
                    failed: 0,
                    skipped: 10,
                    retries: 15
                },
                'third-bro': {
                    total: 10,
                    passed: 5,
                    failed: 5,
                    skipped: 0,
                    retries: 5
                }
            }
        };

        it('should return correct statistics when it is not filtered', () => {
            const stats = utils.getStats(inputStats, []);

            assert.deepEqual(stats, {
                total: 40,
                passed: 20,
                failed: 10,
                skipped: 10,
                retries: 30
            });
        });

        it('should return correct statistics for one filtered browser', () => {
            const stats = utils.getStats(inputStats, ['first-bro']);

            assert.deepEqual(stats, {
                total: 15,
                passed: 10,
                failed: 5,
                skipped: 0,
                retries: 10
            });
        });

        it('should return correct statistics for several filtered browsers', () => {
            const stats = utils.getStats(inputStats, ['first-bro', 'second-bro']);

            assert.deepEqual(stats, {
                total: 30,
                passed: 15,
                failed: 5,
                skipped: 10,
                retries: 25
            });
        });
    });

    describe('getHttpErrorMessage', () => {
        it('should return response error', () => {
            const response = {status: '500', data: 'some-response-error'};

            assert.equal(utils.getHttpErrorMessage({response}), '(500) some-response-error');
        });

        it('should return native error if there is no response error', () => {
            assert.equal(utils.getHttpErrorMessage(new Error('some-native-error')), 'some-native-error');
        });

        it('should return response error ignoring native error', () => {
            const response = {status: '500', data: 'some-response-error'};
            const error = new Error('some-native-error');

            assert.equal(utils.getHttpErrorMessage({...error, response}), '(500) some-response-error');
        });
    });

    describe('hasFailedRetries', () => {
        [
            {expected: undefined, retries: []},
            {expected: undefined, retries: [{status: 'success'}]},
            {expected: undefined, retries: [null]},
            {expected: true, retries: [{status: 'success'}, {status: 'fail'}]},
            {expected: true, retries: [{status: 'success'}, {status: 'error'}, null]}
        ].forEach(({expected, retries}) => {
            it(`should return ${expected} for ${JSON.stringify(retries)}`, () => {
                assert.strictEqual(utils.hasFailedRetries({retries}), expected);
            });
        });
    });
});
