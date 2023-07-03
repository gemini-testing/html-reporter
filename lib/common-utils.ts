import crypto from 'crypto';
import {pick} from 'lodash';
import url from 'url';
import axios, {AxiosRequestConfig} from 'axios';
import {SUCCESS, FAIL, ERROR, SKIPPED, UPDATED, IDLE, RUNNING, QUEUED} from './constants/test-statuses';

import {UNCHECKED, INDETERMINATE, CHECKED} from './constants/checked-statuses';
export const getShortMD5 = (str: string): string => {
    return crypto.createHash('md5').update(str, 'ascii').digest('hex').substr(0, 7);
};

const statusPriority: string[] = [
    // non-final
    RUNNING, QUEUED,

    // final
    ERROR, FAIL, UPDATED, SUCCESS, IDLE, SKIPPED
];

export const logger = pick(console, ['log', 'warn', 'error']);

export const isSuccessStatus = (status: string): boolean => status === SUCCESS;
export const isFailStatus = (status: string): boolean => status === FAIL;
export const isIdleStatus = (status: string): boolean => status === IDLE;
export const isRunningStatus = (status: string): boolean => status === RUNNING;
export const isErroredStatus = (status: string): boolean => status === ERROR;
export const isSkippedStatus = (status: string): boolean => status === SKIPPED;
export const isUpdatedStatus = (status: string): boolean => status === UPDATED;

export const determineStatus = (statuses: string[]): string | null => {
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

    return null;
};

export const isUrl = (str: string): boolean => {
    if (typeof str !== 'string') {
        return false;
    }

    const parsedUrl = url.parse(str);

    return !!parsedUrl.host && !!parsedUrl.protocol;
};

export const buildUrl = (href: string, {host}: {host?: string} = {}): string => {
    return host
        ? url.format(Object.assign(url.parse(href), {host}))
        : href;
};

export const fetchFile = async <T = unknown>(url: string, options?: AxiosRequestConfig) : Promise<{data: T | null, status: number}> => {
    try {
        const {data, status} = await axios.get(url, options);

        return {data, status};
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        logger.warn(`Error while fetching ${url}`, e);

        // 'unknown' for request blocked by CORS policy
        const status = e.response ? e.response.status : 'unknown';

        return {data: null, status};
    }
};

const isRelativeUrl = (url: string): boolean => {
    try {
        // eslint-disable-next-line no-new
        new URL(url);

        return false;
    } catch (e) {
        return true;
    }
};

export const normalizeUrls = (urls: string[] = [], baseUrl: string): string[] => {
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
            logger.warn(`Can not normalize url '${url} for base url '${baseUrl}'`, e);

            return url;
        }
    });
};

// TODO: use enum types instead of numbers below
export const isCheckboxChecked = (status: number): boolean => Number(status) === CHECKED;
export const isCheckboxIndeterminate = (status: number): boolean => Number(status) === INDETERMINATE;
export const isCheckboxUnchecked = (status: number): boolean => Number(status) === UNCHECKED;
export const getToggledCheckboxState = (status: number): number => isCheckboxChecked(status) ? UNCHECKED : CHECKED;
