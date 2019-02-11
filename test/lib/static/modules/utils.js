'use strict';

const utils = require('../../../../lib/static/modules/utils');
const {FAIL, ERROR, SUCCESS} = require('../../../../lib/constants/test-statuses');
const {NO_REF_IMAGE_ERROR} = require('../../../../lib/constants/errors').getCommonErrors();
const {mkSuite, mkState, mkBrowserResult} = require('../../../utils');

describe('static/modules/utils', () => {
    describe('isAcceptable', () => {
        describe('should return true', () => {
            it('for failed test', () => {
                assert.isTrue(utils.isAcceptable({status: FAIL}));
            });

            it('for test with missing reference image', () => {
                const error = {stack: NO_REF_IMAGE_ERROR};

                assert.isTrue(utils.isAcceptable({status: ERROR, error}));
            });
        });

        describe('should return false', () => {
            it('for test with not screenshot error', () => {
                assert.isFalse(utils.isAcceptable({status: ERROR, error: {}}));
            });

            it('for test with empty error', () => {
                assert.isFalse(utils.isAcceptable({status: ERROR, error: null}));
            });

            it('for not failed test', () => {
                assert.isFalse(utils.isAcceptable({status: SUCCESS}));
            });
        });
    });

    describe('shouldSuiteBeShownByName', () => {
        const suite = mkSuite({
            suitePath: ['Some suite'],
            children: [
                mkState({
                    suitePath: ['Some suite', 'test one']
                })
            ]
        });

        it('should be true if top-level title matches', () => {
            assert.isTrue(utils.shouldSuiteBeShownByName(suite, 'Some suite'));
        });

        it('should be true if bottom-level title matches', () => {
            assert.isTrue(utils.shouldSuiteBeShownByName(suite, 'test one'));
        });

        it('should be false if no matches found', () => {
            assert.isFalse(utils.shouldSuiteBeShownByName(suite, 'test two'));
        });

        it('should be true if full title matches', () => {
            assert.isTrue(utils.shouldSuiteBeShownByName(suite, 'Some suite test one'));
        });

        it('should be false if only part of only top-level title matches', () => {
            assert.isFalse(utils.shouldSuiteBeShownByName(suite, 'Some suite test two'));
        });

        it('should be false if only part of only bottom-level title matches', () => {
            assert.isFalse(utils.shouldSuiteBeShownByName(suite, 'Another suite test one'));
        });
    });

    describe('shouldSuiteBeShownByBrowser', () => {
        const suite = mkSuite({
            children: [
                mkState({
                    browsers: [
                        mkBrowserResult({name: 'first-bro'})
                    ]
                })
            ]
        });

        it('should be true if browser id is equal', () => {
            assert.isTrue(utils.shouldSuiteBeShownByBrowser(suite, ['first-bro']));
        });

        it('should be false if browser id is not a strict match', () => {
            assert.isFalse(utils.shouldSuiteBeShownByBrowser(suite, ['first']));
        });

        it('should be false if browser id is not equal', () => {
            assert.isFalse(utils.shouldSuiteBeShownByBrowser(suite, ['second-bro']));
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
});
