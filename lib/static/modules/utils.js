'use strict';

const url = require('url');
const {get, isEmpty} = require('lodash');
const {isIdleStatus, isSuccessStatus, isUpdatedStatus, isFailStatus, isErroredStatus, isSkippedStatus} = require('../../common-utils');
const {getCommonErrors} = require('../../constants/errors');

const {NO_REF_IMAGE_ERROR, ASSERT_VIEW_ERROR} = getCommonErrors();

function hasFailedImages(result) {
    const {imagesInfo = []} = result;

    return imagesInfo.some(({status}) => isErroredStatus(status) || isFailStatus(status));
}

function isNoRefImageError(error) {
    const stack = get(error, 'stack', '');
    return stack.startsWith(NO_REF_IMAGE_ERROR);
}

function isAssertViewError(error) {
    const stack = get(error, 'stack', '');
    return stack.startsWith(ASSERT_VIEW_ERROR);
}

function hasNoRefImageErrors({imagesInfo = []}) {
    return Boolean(imagesInfo.filter(({error}) => isNoRefImageError(error)).length);
}

function hasResultFails(testResult) {
    return hasFailedImages(testResult) || isErroredStatus(testResult.status) || isFailStatus(testResult.status);
}

function isSuiteIdle(suite) {
    return isIdleStatus(suite.status);
}

function isSuiteSuccessful(suite) {
    return isSuccessStatus(suite.status);
}

function isSuiteFailed(suite) {
    return isFailStatus(suite.status) || isErroredStatus(suite.status);
}

function isNodeFailed(node) {
    return isFailStatus(node.status) || isErroredStatus(node.status);
}

function isNodeSuccessful(node) {
    return isSuccessStatus(node.status) || isUpdatedStatus(node.status);
}

function isAcceptable({status, error}) {
    return isErroredStatus(status) && isNoRefImageError(error) || isFailStatus(status) || isSkippedStatus(status);
}

function dateToLocaleString(date) {
    if (!date) {
        return '';
    }
    const lang = isEmpty(navigator.languages) ? navigator.language : navigator.languages[0];
    return new Date(date).toLocaleString(lang);
}

function isUrl(str) {
    if (typeof str !== 'string') {
        return false;
    }

    const parsedUrl = url.parse(str);

    return parsedUrl.host && parsedUrl.protocol;
}

function isTestNameMatchFilters(testName, testNameFilter, strictMatchFilter) {
    if (!testNameFilter) {
        return true;
    }

    return strictMatchFilter
        ? testName === testNameFilter
        : testName.includes(testNameFilter);
}

function getHttpErrorMessage(error) {
    const {message, response} = error;

    return response ? `(${response.status}) ${response.data}` : message;
}

module.exports = {
    isNoRefImageError,
    isAssertViewError,
    hasNoRefImageErrors,
    hasResultFails,
    isSuiteIdle,
    isSuiteSuccessful,
    isSuiteFailed,
    isNodeFailed,
    isNodeSuccessful,
    isAcceptable,
    dateToLocaleString,
    isUrl,
    isTestNameMatchFilters,
    getHttpErrorMessage
};
