'use strict';

const utils = require('../../../../lib/static/modules/utils');
const {FAIL, ERROR, SUCCESS} = require('../../../../lib/constants/test-statuses');
const {NO_REF_IMAGE_ERROR} = require('../../../../lib/constants/errors').getCommonErrors();

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
});
