import crypto from 'crypto';
import {pick, isEmpty} from 'lodash';
import url from 'url';
import axios, {AxiosRequestConfig} from 'axios';
import {SUCCESS, FAIL, ERROR, SKIPPED, UPDATED, IDLE, RUNNING, QUEUED, TestStatus} from './constants';

import {UNCHECKED, INDETERMINATE, CHECKED} from './constants/checked-statuses';
import {AssertViewResult, TestError} from './types';
import {ErrorName, ImageDiffError, NoRefImageError} from './errors';
export const getShortMD5 = (str: string): string => {
    return crypto.createHash('md5').update(str, 'ascii').digest('hex').substr(0, 7);
};

const statusPriority: TestStatus[] = [
    // non-final
    RUNNING, QUEUED,

    // final
    ERROR, FAIL, UPDATED, SUCCESS, IDLE, SKIPPED
];

export const logger = pick(console, ['log', 'warn', 'error']);

export const isSuccessStatus = (status: TestStatus): boolean => status === SUCCESS;
export const isFailStatus = (status: TestStatus): boolean => status === FAIL;
export const isIdleStatus = (status: TestStatus): boolean => status === IDLE;
export const isRunningStatus = (status: TestStatus): boolean => status === RUNNING;
export const isErroredStatus = (status: TestStatus): boolean => status === ERROR;
export const isSkippedStatus = (status: TestStatus): boolean => status === SKIPPED;
export const isUpdatedStatus = (status: TestStatus): boolean => status === UPDATED;

export const determineStatus = (statuses: TestStatus[]): TestStatus | null => {
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

export const getAbsoluteUrl = (url: string | undefined, base: string | undefined): string => {
    try {
        const userUrl = new URL(url ?? '', base);

        if (!isEmpty(base)) {
            const baseUrl = new URL(base as string);

            if (baseUrl.host) {
                userUrl.host = baseUrl.host;
            }
            if (baseUrl.protocol) {
                userUrl.protocol = baseUrl.protocol;
            }
        }

        return userUrl.href;
    } catch {
        return url || base || '';
    }
};

export const getRelativeUrl = (absoluteUrl: string): string => {
    try {
        const urlObj = new URL(absoluteUrl);

        return urlObj.pathname + urlObj.search;
    } catch {
        return absoluteUrl;
    }
};

export const wrapLinkByTag = (text: string): string => {
    return text.replace(/https?:\/\/[^\s]*/g, (url) => {
        return `<a target="_blank" href="${url}">${url}</a>`;
    });
};

export const mkTestId = (fullTitle: string, browserId: string): string => {
    return fullTitle + '.' + browserId;
};

export const isImageDiffError = (assertResult: AssertViewResult): assertResult is ImageDiffError => {
    return (assertResult as ImageDiffError).name === ErrorName.IMAGE_DIFF;
};

export const isNoRefImageError = (assertResult: AssertViewResult): assertResult is NoRefImageError => {
    return (assertResult as NoRefImageError).name === ErrorName.NO_REF_IMAGE;
};

export const getError = (error?: TestError): undefined | Pick<TestError, 'message' | 'stack' | 'stateName'> => {
    if (!error) {
        return undefined;
    }

    return pick(error, ['message', 'stack', 'stateName']);
};

export const hasDiff = (assertViewResults: AssertViewResult[]): boolean => {
    return assertViewResults.some((result) => isImageDiffError(result));
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
