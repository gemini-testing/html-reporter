'use strict';

const utils = require('lib/static/modules/utils');
const {IDLE, FAIL, ERROR, SKIPPED, SUCCESS} = require('lib/constants/test-statuses');
const {NO_REF_IMAGE_ERROR} = require('lib/constants/errors').getCommonErrors();

describe('static/modules/utils', () => {
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
});
