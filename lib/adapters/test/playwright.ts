import type {TestCase, TestResult} from '@playwright/test/reporter';

import {PlaywrightTestResultAdapter, ImageTitleEnding, type PlaywrightAttachment} from '../test-result/playwright';
import {UNKNOWN_ATTEMPT} from '../../constants';

import type {TestAdapter, CreateTestResultOpts} from './';
import type {ReporterTestResult} from '../test-result';
import type {AssertViewResult, ImageFile, RefImageFile} from '../../types';
import type {ImageDiffError} from '../../errors';

export type PwtRawTest = {
    file: string;
    browserName: string;
    title: string;
    titlePath: string[];
}

export class PlaywrightTestAdapter implements TestAdapter {
    private _test: PwtRawTest;

    static create<T extends PlaywrightTestAdapter>(this: new (test: PwtRawTest) => T, test: PwtRawTest): T {
        return new this(test);
    }

    constructor(test: PwtRawTest) {
        this._test = test;
    }

    get original(): PwtRawTest {
        return this._test;
    }

    get id(): string {
        return this._test.title;
    }

    get pending(): boolean {
        return false;
    }

    get disabled(): boolean {
        return false;
    }

    get silentlySkipped(): boolean {
        return false;
    }

    get browserId(): string {
        return this._test.browserName;
    }

    get fullName(): string {
        return this._test.title;
    }

    get file(): string {
        return this._test.file;
    }

    get titlePath(): string[] {
        return this._test.titlePath;
    }

    createTestResult(opts: CreateTestResultOpts): ReporterTestResult {
        const {status, attempt = UNKNOWN_ATTEMPT, assertViewResults = []} = opts;

        const testCase = {
            titlePath: () => ['', this._test.browserName, this._test.file, ...this._test.titlePath],
            title: this._test.title,
            annotations: [],
            location: {
                file: this._test.file
            },
            parent: {
                project: () => ({
                    name: this._test.browserName
                })
            }
        } as unknown as TestCase;

        const attachments = assertViewResults.map(assertViewResult => {
            const attachmentByState = [generateExpectedAttachment(assertViewResult, assertViewResult.refImg)];

            if ((assertViewResult as ImageDiffError).currImg) {
                attachmentByState.push(generateActualAttachment(assertViewResult, (assertViewResult as ImageDiffError).currImg));
            }

            if ((assertViewResult as ImageDiffError).diffImg) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                attachmentByState.push(generateDiffAttachment(assertViewResult, (assertViewResult as ImageDiffError).diffImg!));
            }

            return attachmentByState;
        }).flat();

        const result = {
            attachments,
            status,
            steps: [],
            startTime: new Date()
        } as unknown as TestResult;

        return PlaywrightTestResultAdapter.create(testCase, result, attempt);
    }
}

function generateExpectedAttachment(assertViewResult: AssertViewResult, imageFile: ImageFile): PlaywrightAttachment {
    return {
        name: `${assertViewResult.stateName}${ImageTitleEnding.Expected}`,
        relativePath: (assertViewResult.refImg as RefImageFile).relativePath,
        ...generateAttachment(assertViewResult, imageFile)
    };
}

function generateActualAttachment(assertViewResult: AssertViewResult, imageFile: ImageFile): PlaywrightAttachment {
    return {
        name: `${assertViewResult.stateName}${ImageTitleEnding.Actual}`,
        ...generateAttachment(assertViewResult, imageFile)
    };
}

function generateDiffAttachment(assertViewResult: AssertViewResult, imageFile: ImageFile): PlaywrightAttachment {
    return {
        name: `${assertViewResult.stateName}${ImageTitleEnding.Diff}`,
        ...generateAttachment(assertViewResult, imageFile)
    };
}

function generateAttachment(assertViewResult: AssertViewResult, imageFile: ImageFile): Pick<PlaywrightAttachment, 'path' | 'contentType' | 'size' | 'isUpdated'> {
    return {
        path: imageFile.path,
        contentType: 'image/png',
        size: imageFile.size,
        isUpdated: assertViewResult.isUpdated
    };
}
