import crypto from 'crypto';
import {isEmpty, pick} from 'lodash';
import url from 'url';
import axios, {AxiosRequestConfig} from 'axios';
import {
    ERROR,
    FAIL,
    IDLE,
    QUEUED,
    RUNNING,
    SKIPPED,
    SUCCESS,
    TestStatus,
    UPDATED,
    STAGED,
    COMMITED
} from './constants';

import {CHECKED, INDETERMINATE, UNCHECKED} from './constants/checked-statuses';
import {
    ImageBase64,
    ImageBuffer,
    ImageFile,
    ImageInfoDiff,
    ImageInfoFull,
    ImageInfoWithState,
    TestError
} from './types';
import {ErrorName, ImageDiffError, NoRefImageError} from './errors';
import type {ReporterTestResult} from './adapters/test-result';

export const getShortMD5 = (str: string): string => {
    return crypto.createHash('md5').update(str, 'ascii').digest('hex').substr(0, 7);
};

const statusPriority: TestStatus[] = [
    // non-final
    RUNNING, QUEUED,

    // final
    ERROR, FAIL, STAGED, COMMITED, UPDATED, SUCCESS, IDLE, SKIPPED
];

export const logger = pick(console, ['log', 'warn', 'error']);

export const isSuccessStatus = (status: TestStatus): boolean => status === SUCCESS;
export const isFailStatus = (status: TestStatus): status is TestStatus.FAIL => status === FAIL;
export const isIdleStatus = (status: TestStatus): boolean => status === IDLE;
export const isRunningStatus = (status: TestStatus): boolean => status === RUNNING;
export const isErrorStatus = (status: TestStatus): boolean => status === ERROR;
export const isSkippedStatus = (status: TestStatus): boolean => status === SKIPPED;
export const isUpdatedStatus = (status: TestStatus): boolean => status === UPDATED;
export const isStagedStatus = (status: TestStatus): boolean => status === STAGED;
export const isCommitedStatus = (status: TestStatus): boolean => status === COMMITED;

export const determineFinalStatus = (statuses: TestStatus[]): TestStatus | null => {
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

export const getUrlWithBase = (url: string | undefined, base: string | undefined): string => {
    if (isEmpty(base)) {
        return url ?? '';
    }

    try {
        const userUrl = new URL(url ?? '', base);

        // Manually overriding properties, because if userUrl is absolute, the above won't work
        const baseUrl = new URL(base as string);

        userUrl.host = baseUrl.host;
        userUrl.protocol = baseUrl.protocol;
        userUrl.port = baseUrl.port;
        userUrl.username = baseUrl.username;
        userUrl.password = baseUrl.password;

        for (const [key, value] of baseUrl.searchParams) {
            userUrl.searchParams.append(key, value);
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

export const isImageError = (error?: unknown): boolean => {
    return isAssertViewError(error) || isImageDiffError(error) || isNoRefImageError(error);
};

export const hasNoRefImageErrors = ({assertViewResults = []}: {assertViewResults?: {name?: string}[]}): boolean => {
    return assertViewResults.some((assertViewResult) => isNoRefImageError(assertViewResult));
};

export const hasFailedImages = (imagesInfo: ImageInfoFull[] = []): boolean => {
    return imagesInfo.some((imageInfo: ImageInfoFull) => {
        return (imageInfo as ImageInfoDiff).stateName &&
            (isErrorStatus(imageInfo.status) || isFailStatus(imageInfo.status) || isNoRefImageError(imageInfo) || isImageDiffError(imageInfo));
    });
};

export const hasUnrelatedToScreenshotsErrors = (error: TestError): boolean => {
    return !isNoRefImageError(error) &&
        !isImageDiffError(error) &&
        !isAssertViewError(error);
};

export const getError = (error?: TestError): undefined | Pick<TestError, 'name' | 'message' | 'stack' | 'stateName' | 'snippet'> => {
    if (!error) {
        return undefined;
    }

    return pick(error, ['name', 'message', 'stack', 'stateName', 'snippet']);
};

export const hasDiff = (assertViewResults: {name?: string}[]): boolean => {
    return assertViewResults.some((result) => isImageDiffError(result as {name?: string}));
};

/* This method tries to determine true status of testResult by using fields like error, imagesInfo */
export const determineStatus = (testResult: Pick<ReporterTestResult, 'status' | 'error' | 'imagesInfo'>): TestStatus => {
    if (
        !hasFailedImages(testResult.imagesInfo) &&
        !isSkippedStatus(testResult.status) &&
        (!testResult.error || !hasUnrelatedToScreenshotsErrors(testResult.error))
    ) {
        return SUCCESS;
    }

    const imageErrors = (testResult.imagesInfo ?? []).map(imagesInfo => (imagesInfo as {error: {name?: string}}).error ?? {});
    if (hasDiff(imageErrors) || hasNoRefImageErrors({assertViewResults: imageErrors})) {
        return FAIL;
    }

    if (!isEmpty(testResult.error)) {
        return ERROR;
    }

    return testResult.status;
};

export const isBase64Image = (image: ImageFile | ImageBuffer | ImageBase64 | null | undefined): image is ImageBase64 => {
    return Boolean((image as ImageBase64 | undefined)?.base64);
};

export const isUrl = (str: string): boolean => {
    if (typeof str !== 'string') {
        return false;
    }

    const parsedUrl = url.parse(str);

    return !!parsedUrl.host && !!parsedUrl.protocol;
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

export function getDetailsFileName(testId: string, browserId: string, attempt: number): string {
    return `${testId}-${browserId}_${Number(attempt) + 1}_${Date.now()}.json`;
}

export const getTestHash = (testResult: ReporterTestResult): string => {
    return testResult.testPath.concat(testResult.browserId, testResult.attempt.toString()).join(' ');
};

export const isImageBufferData = (imageData: ImageBuffer | ImageFile | ImageBase64 | undefined): imageData is ImageBuffer => {
    return Boolean((imageData as ImageBuffer).buffer);
};

export const isImageInfoWithState = (imageInfo: ImageInfoFull): imageInfo is ImageInfoWithState => {
    return Boolean((imageInfo as ImageInfoWithState).stateName);
};

export const trimArray = <T>(array: Array<T>): Array<T> => {
    let indexBegin = 0;
    let indexEnd = array.length;

    while (indexBegin < array.length && !array[indexBegin]) {
        indexBegin++;
    }

    while (indexEnd > 0 && !array[indexEnd - 1]) {
        indexEnd--;
    }

    return array.slice(indexBegin, indexEnd);
};

const getErrorTitle = (e: Error): string => {
    let errorName = e.name;

    if (!errorName && e.stack) {
        const columnIndex = e.stack.indexOf(':');

        if (columnIndex !== -1) {
            errorName = e.stack.slice(0, columnIndex);
        } else {
            errorName = e.stack.slice(0, e.stack.indexOf('\n'));
        }
    }

    if (!errorName) {
        errorName = 'Error';
    }

    return e.message ? `${errorName}: ${e.message}` : errorName;
};

const getErrorRawStackFrames = (e: Error & { stack: string }): string => {
    const errorTitle = getErrorTitle(e) + '\n';
    const errorTitleStackIndex = e.stack.indexOf(errorTitle);

    if (errorTitleStackIndex !== -1) {
        return e.stack.slice(errorTitleStackIndex + errorTitle.length);
    }

    const errorString = e.toString ? e.toString() + '\n' : '';
    const errorStringIndex = e.stack.indexOf(errorString);

    if (errorString && errorStringIndex !== -1) {
        return e.stack.slice(errorStringIndex + errorString.length);
    }

    const errorMessageStackIndex = e.stack.indexOf(e.message);
    const errorMessageEndsStackIndex = e.stack.indexOf('\n', errorMessageStackIndex + e.message.length);

    return e.stack.slice(errorMessageEndsStackIndex + 1);
};

const cloneError = <T extends Error>(error: T): T => {
    const originalProperties = ['name', 'message', 'stack'] as Array<keyof Error>;
    const clonedError = new Error(error.message) as T;

    originalProperties.forEach(property => {
        delete clonedError[property];
    });

    const customProperties = Object.getOwnPropertyNames(error) as Array<keyof Error>;

    originalProperties.concat(customProperties).forEach((property) => {
        clonedError[property] = error[property] as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    return clonedError;
};

export const mergeSnippetIntoErrorStack = <T extends Error>(error: T & { snippet?: string }): T => {
    if (!error || !error.snippet) {
        return error;
    }

    const clonedError = cloneError(error);

    delete clonedError.snippet;

    if (!error.stack) {
        clonedError.stack = [
            getErrorTitle(error),
            error.snippet
        ].join('\n');

        return clonedError;
    }

    const grayBegin = '\x1B[90m';
    const grayEnd = '\x1B[39m';

    clonedError.stack = [
        getErrorTitle(error),
        error.snippet,
        grayBegin + getErrorRawStackFrames(error as Error & { stack: string }) + grayEnd
    ].join('\n');

    return clonedError;
};
