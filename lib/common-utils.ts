import crypto from 'crypto';
import {pick, isEmpty, omitBy} from 'lodash';
import url from 'url';
import axios, {AxiosRequestConfig} from 'axios';
import {SUCCESS, FAIL, ERROR, SKIPPED, UPDATED, IDLE, RUNNING, QUEUED, TestStatus} from './constants';

import {UNCHECKED, INDETERMINATE, CHECKED} from './constants/checked-statuses';
import {AssertViewResult, ImageData, ImageBase64, ImageInfoFull, TestError, ImageInfoError} from './types';
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
            userUrl.port = baseUrl.port;
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

export const isAssertViewError = (error?: unknown): boolean => {
    return (error as {name?: string})?.name === ErrorName.ASSERT_VIEW;
};

export const isImageDiffError = (error?: unknown): error is ImageDiffError => {
    return (error as {name?: string})?.name === ErrorName.IMAGE_DIFF;
};

export const isNoRefImageError = (error?: unknown): error is NoRefImageError => {
    return (error as {name?: string})?.name === ErrorName.NO_REF_IMAGE;
};

export const hasNoRefImageErrors = ({assertViewResults = []}: {assertViewResults?: AssertViewResult[]}): boolean => {
    return Boolean(assertViewResults.filter((assertViewResult: AssertViewResult) => isNoRefImageError(assertViewResult)).length);
};

const hasFailedImages = (result: {imagesInfo?: ImageInfoFull[]}): boolean => {
    const {imagesInfo = []} = result;

    return imagesInfo.some((imageInfo: ImageInfoFull) => !isAssertViewError((imageInfo as ImageInfoError).error) && (isErroredStatus(imageInfo.status) || isFailStatus(imageInfo.status)));
};

export const hasResultFails = (testResult: {status: TestStatus, imagesInfo?: ImageInfoFull[]}): boolean => {
    return hasFailedImages(testResult) || isErroredStatus(testResult.status) || isFailStatus(testResult.status);
};

export const getError = (error?: TestError): undefined | Pick<TestError, 'name' | 'message' | 'stack' | 'stateName'> => {
    if (!error) {
        return undefined;
    }

    return pick(error, ['name', 'message', 'stack', 'stateName']);
};

export const hasDiff = (assertViewResults: AssertViewResult[]): boolean => {
    return assertViewResults.some((result) => isImageDiffError(result as {name?: string}));
};

export const isBase64Image = (image: ImageData | ImageBase64 | undefined): image is ImageBase64 => {
    return Boolean((image as ImageBase64 | undefined)?.base64);
};

export const isUrl = (str: string): boolean => {
    if (typeof str !== 'string') {
        return false;
    }

    const parsedUrl = url.parse(str);

    return !!parsedUrl.host && !!parsedUrl.protocol;
};

export const buildUrl = (href: string, {host, protocol}: {host?: string, protocol?: string} = {}): string => {
    return host
        ? url.format(Object.assign(url.parse(href), omitBy({host, protocol}, isEmpty)))
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
