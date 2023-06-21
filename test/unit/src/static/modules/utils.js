'use strict';

const utils = require('src/static/modules/utils');
const {IDLE, FAIL, ERROR, SKIPPED, SUCCESS} = require('src/constants/test-statuses');
const viewModes = require('src/constants/view-modes');
const {SECTIONS, RESULT_KEYS, KEY_DELIMITER} = require('src/constants/group-tests');
const {NO_REF_IMAGE_ERROR} = require('src/constants/errors').getCommonErrors();

const {mkBrowser, mkResult} = require('../../static/state-utils');

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

    describe('isNodeFailed', () => {
        describe('should return true for', () => {
            it('failed node', () => {
                assert.isTrue(utils.isNodeFailed({status: FAIL}));
            });

            it('errored node', () => {
                assert.isTrue(utils.isNodeFailed({status: ERROR}));
            });
        });

        it('should return false for successful node', () => {
            assert.isFalse(utils.isNodeFailed({status: SUCCESS}));
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

    describe('"isTestNameMatchFilters"', () => {
        describe('should return "true" if', () => {
            it('filter by name is not passed', () => {
                assert.isTrue(utils.isTestNameMatchFilters('some-test-name'));
            });

            it('test name is contains name from filter', () => {
                assert.isTrue(utils.isTestNameMatchFilters('some-test-name', 'test'));
            });

            it('test name matches on filter strictly', () => {
                assert.isTrue(utils.isTestNameMatchFilters('some-test-name', 'some-test-name', true));
            });
        });

        it('should return "false" if', () => {
            it('test name does not contain name from filter', () => {
                assert.isFalse(utils.isTestNameMatchFilters('some-test-name', 'another'));
            });

            it('test name does not match on filter strictly', () => {
                assert.isTrue(utils.isTestNameMatchFilters('some-test-name', 'some-test-nam', true));
            });
        });
    });

    describe('"isBrowserMatchViewMode"', () => {
        describe('should return "true" if', () => {
            [SUCCESS, ERROR, FAIL, SKIPPED].forEach((status) => {
                it(`viewMode is "${viewModes.ALL}" and node status is "${status}"`, () => {
                    const browsersById = mkBrowser({id: 'browser1', resultIds: ['result1']});
                    const resultsById = mkResult({id: 'result1', status});

                    assert.isTrue(utils.isBrowserMatchViewMode(browsersById.browser1, resultsById.result1, viewModes.ALL));
                });
            });

            [ERROR, FAIL].forEach((status) => {
                it(`viewMode is "${viewModes.FAILED}" and node status is "${status}"`, () => {
                    const browsersById = mkBrowser({id: 'browser1', resultIds: ['result1']});
                    const resultsById = mkResult({id: 'result1', status});

                    assert.isTrue(utils.isBrowserMatchViewMode(browsersById.browser1, resultsById.result1, viewModes.FAILED));
                });
            });

            [[viewModes.PASSED, SUCCESS], [viewModes.SKIPPED, SKIPPED]].forEach(([viewMode, status]) => {
                it(`viewMode is "${viewMode}" and node status is "${status}"`, () => {
                    const browsersById = mkBrowser({id: 'browser1', resultIds: ['result1']});
                    const resultsById = mkResult({id: 'result1', status});

                    assert.isTrue(utils.isBrowserMatchViewMode(browsersById.browser1, resultsById.result1, viewMode));
                });
            });

            it(`viewMode is "${viewModes.RETRIED}" and browser has one or more retries`, () => {
                const browsersById = mkBrowser({id: 'browser1', resultIds: ['result1', 'result2']});
                const resultsById = mkResult({id: 'result2', status: IDLE});

                assert.isTrue(utils.isBrowserMatchViewMode(browsersById.browser1, resultsById.result2, viewModes.RETRIED));
            });
        });

        describe('should return "false" if', () => {
            [SUCCESS, SKIPPED].forEach((status) => {
                it(`viewMode is "${viewModes.FAILED}" and node status is "${status}"`, () => {
                    const browsersById = mkBrowser({id: 'browser1', resultIds: ['result1']});
                    const resultsById = mkResult({id: 'result1', status});

                    assert.isFalse(utils.isBrowserMatchViewMode(browsersById.browser1, resultsById.result1, viewModes.FAILED));
                });
            });

            it(`viewMode is "${viewModes.RETRIED}" and browser has zero retries`, () => {
                const browsersById = mkBrowser({id: 'browser1', resultIds: ['result1']});
                const resultsById = mkResult({id: 'result1', status: IDLE});

                assert.isFalse(utils.isBrowserMatchViewMode(browsersById.browser1, resultsById.result1, viewModes.RETRIED));
            });
        });
    });

    describe('"shouldShowBrowser"', () => {
        [
            {name: 'browser name is equal', filteredBrowsers: [{id: 'yabro'}]},
            {name: 'browser name and versions are equal', filteredBrowsers: [{id: 'yabro', versions: ['1']}]}
        ].forEach(({name, filteredBrowsers}) => {
            it(`should return "true" if ${name}`, () => {
                const browser = {name: 'yabro', version: '1'};

                assert.isTrue(utils.shouldShowBrowser(browser, filteredBrowsers));
            });
        });

        [
            {name: 'browser name is not equal', filteredBrowsers: [{id: 'some-bro'}]},
            {name: 'browser name is equal but versions arent', filteredBrowsers: [{id: 'yabro', versions: ['2']}]}
        ].forEach(({name, filteredBrowsers}) => {
            it(`should return "false" if ${name}`, () => {
                const browser = {name: 'yabro', version: '1'};

                assert.isFalse(utils.shouldShowBrowser(browser, filteredBrowsers));
            });
        });
    });

    describe('"parseKeyToGroupTestsBy"', () => {
        it('should throw error if passed group section is not available', () => {
            const availableGroupSections = Object.values(SECTIONS).join(', ');

            assert.throws(
                () => utils.parseKeyToGroupTestsBy('unknown-group'),
                new RegExp(`Group section must be one of ${availableGroupSections}, but got unknown-group`)
            );
        });

        it('should throw error if passed group key is not supported', () => {
            const availableKeys = RESULT_KEYS.join(', ');

            assert.throws(
                () => utils.parseKeyToGroupTestsBy(`${SECTIONS.RESULT}${KEY_DELIMITER}unknown-key`),
                new RegExp(`Group key must be one of ${availableKeys}, but got unknown-key`)
            );
        });

        it('should correctly parse group', () => {
            const keyToGroupTestsBy = `${SECTIONS.META}${KEY_DELIMITER}foo${KEY_DELIMITER}bar`;

            const result = utils.parseKeyToGroupTestsBy(keyToGroupTestsBy);

            assert.deepEqual(result, [SECTIONS.META, `foo${KEY_DELIMITER}bar`]);
        });
    });
});
