'use strict';

const {pick} = require('lodash');
const url = require('url');
const axios = require('axios');

const {
    SUCCESS,
    FAIL,
    ERROR,
    SKIPPED,
    UPDATED,
    IDLE,
    RUNNING,
    QUEUED
} = require('./constants/test-statuses');

const statusPriority = [
    // non-final
    RUNNING, QUEUED,

    // final
    ERROR, FAIL, UPDATED, SUCCESS, IDLE, SKIPPED
];

exports.logger = pick(console, ['log', 'warn', 'error']);

exports.isSuccessStatus = (status) => status === SUCCESS;
exports.isFailStatus = (status) => status === FAIL;
exports.isIdleStatus = (status) => status === IDLE;
exports.isRunningStatus = (status) => status === RUNNING;
exports.isErroredStatus = (status) => status === ERROR;
exports.isSkippedStatus = (status) => status === SKIPPED;
exports.isUpdatedStatus = (status) => status === UPDATED;

exports.determineStatus = (statuses) => {
    if (!statuses.length) {
        return SUCCESS;
    }

    const set = new Set(statuses);
    for (const status of statusPriority) {
        if (set.has(status)) {
            return status;
        }
    }

    console.error('Unknown statuses: ' + JSON.stringify(statuses));
};

exports.isUrl = (str) => {
    if (typeof str !== 'string') {
        return false;
    }

    const parsedUrl = url.parse(str);

    return parsedUrl.host && parsedUrl.protocol;
};

exports.fetchFile = async (url, options) => {
    try {
        const {data, status} = await axios.get(url, options);

        return {data, status};
    } catch (e) {
        exports.logger.warn(`Error while fetching ${url}`, e);

        // 'unknown' for request blocked by CORS policy
        const status = e.response ? e.response.status : 'unknown';

        return {data: null, status};
    }
};

exports.normalizeUrls = (urls = [], baseUrl) => {
    const baseUrlsSearch = new URL(baseUrl).search;

    return urls.map(url => {
        try {
            const newUrl = new URL(url, baseUrl);

            // URL's parameters can specify directory at file server
            if (isRelativeUrl(url) && !newUrl.search) {
                newUrl.search = baseUrlsSearch;
            }

            return newUrl.href;
        } catch (e) {
            exports.logger.warn(`Can not normalize url '${url} for base url '${baseUrl}'`, e);

            return url;
        }
    });
};

function isRelativeUrl(url) {
    try {
        // eslint-disable-next-line no-new
        new URL(url);

        return false;
    } catch (e) {
        return true;
    }
}
