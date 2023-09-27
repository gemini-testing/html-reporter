import path from 'path';
import {TestCase as PlaywrightTestCase, TestResult as PlaywrightTestResult} from '@playwright/test/reporter';
import sizeOf from 'image-size';
import _ from 'lodash';
import stripAnsi from 'strip-ansi';

import {ReporterTestResult} from './index';
import {FAIL, PWT_TITLE_DELIMITER, TestStatus} from '../constants';
import {AssertViewResult, ErrorDetails, ImageData, ImageInfoFull, ImageSize, TestError} from '../types';
import {getShortMD5, isImageDiffError, isNoRefImageError} from '../common-utils';
import {ImagesInfoFormatter} from '../image-handler';
import {ErrorName} from '../errors';

export type PlaywrightAttachment = PlaywrightTestResult['attachments'][number];

export enum PwtTestStatus {
    PASSED = 'passed',
    FAILED = 'failed',
    TIMED_OUT = 'timedOut',
    INTERRUPTED = 'interrupted',
    SKIPPED = 'skipped',
}

export enum ImageTitleEnding {
    Expected = '-expected.png',
    Actual = '-actual.png',
    Diff = '-diff.png',
    Previous = '-previous.png'
}

const ANY_IMAGE_ENDING_REGEXP = new RegExp(Object.values(ImageTitleEnding).map(ending => `${ending}$`).join('|'));

export const getStatus = (result: PlaywrightTestResult): TestStatus => {
    if (result.status === PwtTestStatus.PASSED) {
        return TestStatus.SUCCESS;
    }

    if (
        [PwtTestStatus.FAILED, PwtTestStatus.TIMED_OUT, PwtTestStatus.INTERRUPTED].includes(
            result.status as PwtTestStatus
        )
    ) {
        return TestStatus.FAIL;
    }

    return TestStatus.SKIPPED;
};

const extractErrorMessage = (result: PlaywrightTestResult): string => {
    if (_.isEmpty(result.errors)) {
        return '';
    }

    if (result.errors.length === 1) {
        return stripAnsi(result.errors[0].message || '').split('\n')[0];
    }

    return JSON.stringify(result.errors.map(err => stripAnsi(err.message || '').split('\n')[0]));
};

const extractErrorStack = (result: PlaywrightTestResult): string => {
    if (_.isEmpty(result.errors)) {
        return '';
    }

    if (result.errors.length === 1) {
        return stripAnsi(result.errors[0].stack || '');
    }

    return JSON.stringify(result.errors.map(err => stripAnsi(err.stack || '')));
};

const getImageData = (attachment: PlaywrightAttachment | undefined): ImageData | null => {
    if (!attachment) {
        return null;
    }

    return {
        path: attachment.path as string,
        size: _.pick(sizeOf(attachment.path as string), ['height', 'width']) as ImageSize
    };
};

export interface PlaywrightTestAdapterOptions {
    imagesInfoFormatter: ImagesInfoFormatter;
}

export class PlaywrightTestAdapter implements ReporterTestResult {
    private readonly _testCase: PlaywrightTestCase;
    private readonly _testResult: PlaywrightTestResult;
    private _imagesInfoFormatter: ImagesInfoFormatter;

    constructor(testCase: PlaywrightTestCase, testResult: PlaywrightTestResult, {imagesInfoFormatter}: PlaywrightTestAdapterOptions) {
        this._testCase = testCase;
        this._testResult = testResult;
        this._imagesInfoFormatter = imagesInfoFormatter;
    }

    get assertViewResults(): AssertViewResult[] {
        return Object.entries(this._attachmentsByState).map(([state, attachments]): AssertViewResult | null => {
            const refImg = getImageData(attachments.find(a => a.name?.endsWith(ImageTitleEnding.Expected)));
            const diffImg = getImageData(attachments.find(a => a.name?.endsWith(ImageTitleEnding.Diff)));
            const currImg = getImageData(attachments.find(a => a.name?.endsWith(ImageTitleEnding.Actual)));

            if (this.error?.name === ErrorName.IMAGE_DIFF && refImg && diffImg && currImg) {
                return {
                    name: ErrorName.IMAGE_DIFF,
                    stateName: state,
                    refImg,
                    diffImg,
                    currImg
                };
            } else if (this.error?.name === ErrorName.NO_REF_IMAGE && currImg) {
                return {
                    name: ErrorName.NO_REF_IMAGE,
                    message: this.error.message,
                    stack: this.error.stack,
                    stateName: state,
                    currImg
                };
            }

            return null;
        }).filter(Boolean) as AssertViewResult[];
    }

    get attempt(): number {
        return this._testResult.retry;
    }

    get browserId(): string {
        return this._testCase.parent.project()?.name as string;
    }

    get description(): string | undefined {
        return undefined;
    }

    get error(): TestError | undefined {
        const message = extractErrorMessage(this._testResult);
        if (message) {
            const result: TestError = {name: ErrorName.GENERAL_ERROR, message};

            const stack = extractErrorStack(this._testResult);
            if (stack) {
                result.stack = stack;
            }

            if (message.includes('snapshot doesn\'t exist') && message.includes('.png')) {
                result.name = ErrorName.NO_REF_IMAGE;
            } else if (message.includes('Screenshot comparison failed')) {
                result.name = ErrorName.IMAGE_DIFF;
            }

            return result;
        }
        return undefined;
    }

    get errorDetails(): ErrorDetails | null {
        return null;
    }

    get file(): string {
        return path.relative(process.cwd(), this._testCase.location.file);
    }

    get fullName(): string {
        return this.testPath.join(PWT_TITLE_DELIMITER);
    }

    get history(): string[] {
        return this._testResult.steps.map(step => `${step.title} <- ${step.duration}ms\n`);
    }

    get id(): string {
        return this.testPath.concat(this.browserId, this.attempt.toString()).join(' ');
    }

    get imageDir(): string {
        return getShortMD5(this.fullName);
    }

    get imagesInfo(): ImageInfoFull[] | undefined {
        return this._imagesInfoFormatter.getImagesInfo(this);
    }

    get isUpdated(): boolean {
        return false;
    }

    get meta(): Record<string, unknown> {
        return Object.fromEntries(this._testCase.annotations.map(a => [a.type, a.description ?? '']));
    }

    get multipleTabs(): boolean {
        return true;
    }

    get screenshot(): ImageData | null {
        const pageScreenshot = this._testResult.attachments.find(a => a.contentType === 'image/png' && a.name === 'screenshot');

        return getImageData(pageScreenshot);
    }

    get sessionId(): string {
        // TODO: implement getting sessionId
        return '';
    }

    get skipReason(): string {
        return this._testCase.annotations.find(a => a.type === 'skip')?.description || '';
    }

    get state(): { name: string } {
        return {name: this._testCase.title};
    }

    get status(): TestStatus {
        const status = getStatus(this._testResult);
        if (status === TestStatus.FAIL) {
            if (isNoRefImageError(this.error) || isImageDiffError(this.error)) {
                return FAIL;
            }
            return TestStatus.ERROR;
        }

        return status;
    }

    get testPath(): string[] {
        // slicing because first entries are not actually test-name, but a file, etc.
        return this._testCase.titlePath().slice(3);
    }

    get timestamp(): number | undefined {
        return this._testResult.startTime.getTime();
    }

    get url(): string {
        // TODO: implement this getter. One of the possible solutions would be to provide a fixture similar to
        //       page.goto(), which would write last visited URL to test annotations
        return '';
    }

    private get _attachmentsByState(): Record<string, PlaywrightAttachment[]> {
        // Filtering out only images. Page screenshots on reject are named "screenshot", we don't want them in state either.
        const imageAttachments = this._testResult.attachments.filter(
            a => a.contentType === 'image/png' && ANY_IMAGE_ENDING_REGEXP.test(a.name));

        return _.groupBy(imageAttachments, a => a.name.replace(ANY_IMAGE_ENDING_REGEXP, ''));
    }
}
