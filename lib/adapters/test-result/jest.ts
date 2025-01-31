import {NEW_ISSUE_LINK, TestStatus, UNKNOWN_ATTEMPT} from '../../constants';
import {ErrorName} from '../../errors';
import {
    ErrorDetails,
    ImageFile,
    ImageInfoFull,
    TestError, TestStepCompressed
} from '../../types';

import {Test, TestResult} from '@jest/reporters';
import path from 'path';

import {ReporterTestResult} from './index';

export type AssertionResult = TestResult['testResults'][number];

export class JestTestResultAdapter implements ReporterTestResult {
    private readonly _test: Test;
    private readonly _testResult: TestResult;
    private readonly _assertionResult: AssertionResult;
    private readonly _attempt: number;

    static create(
        this: typeof JestTestResultAdapter,
        test: Test,
        testResult: TestResult,
        assertionResult: AssertionResult,
        attempt: number
    ): JestTestResultAdapter {
        return new this(test, testResult, assertionResult, attempt);
    }

    constructor(test: Test, testResult: TestResult, assertionResult: AssertionResult, attempt = assertionResult.invocations ?? UNKNOWN_ATTEMPT) {
        this._test = test;
        this._testResult = testResult;
        this._assertionResult = assertionResult;
        this._attempt = attempt;
    }

    get attempt(): number {
        return this._attempt;
    }

    get browserId(): string {
        return `Node ${process.version}`;
    }

    get description(): string {
        return this._test.context.config.displayName?.name
            ?? this._assertionResult.title;
    }

    private getErrorMessage(): string | undefined {
        if (this._assertionResult.status !== 'failed') {
            return;
        }

        const details = this._assertionResult.failureDetails[0] as { message?: string } | undefined;

        if (!details || !details?.message) {
            // failureDetails is of type unknown.
            // Usually it is an object with message field, but other possible cases handles here
            return 'The test crashed and we can\'t read the error message.\n'
                + `Please, report an issue at ${NEW_ISSUE_LINK}\n`
                + '\n'
                + 'Failure details we can\'t read:\n'
                + JSON.stringify(this._assertionResult.failureDetails);
        }

        return details.message;
    }

    private getErrorStack(): string | undefined {
        if (this._assertionResult.status !== 'failed') {
            return;
        }

        return this._assertionResult.failureMessages.join('\n');
    }

    get error(): TestError | undefined {
        if (this._assertionResult.status !== 'failed') {
            return;
        }

        const message = this.getErrorMessage();

        if (message) {
            const result: TestError = {name: ErrorName.GENERAL_ERROR, message};

            result.stack = this.getErrorStack();

            return result;
        }

        return undefined;
    }

    get errorDetails(): ErrorDetails | null {
        if (this._assertionResult.status !== 'failed') {
            return null;
        }

        const title = this.description;
        const filePath = this.file;

        return {
            title,
            filePath
        };
    }

    get file(): string {
        return path.relative(process.cwd(), this._test.path);
    }

    get fullName(): string {
        return [
            ...this.testPath
        ].join(' ');
    }

    get id(): string {
        return [
            this.file,
            ...this.testPath,
            this.browserId,
            this.attempt.toString()
        ].join(' ');
    }

    get imageDir(): string {
        // Not suitable for jest
        return '';
    }

    get imagesInfo(): ImageInfoFull[] {
        return [];
    }

    get meta(): Record<string, unknown> {
        return {
            'tests failed in file': String(this._testResult.numFailingTests),
            'tests passed in file': String(this._testResult.numPassingTests),
            'file duration': this._testResult.perfStats.runtime + ' ms'
        };
    }

    get multipleTabs(): boolean {
        return true;
    }

    get screenshot(): ImageFile | null {
        return null;
    }

    get sessionId(): string {
        return '';
    }

    get skipReason(): string {
        return this._testResult.skipped ? 'Skipped' : '';
    }

    get state(): { name: string } {
        return {name: this.description};
    }

    get status(): TestStatus {
        const status = this._assertionResult.status;

        switch (status) {
            case 'failed':
                return TestStatus.ERROR;
            case 'passed':
                return TestStatus.SUCCESS;
            case 'disabled':
            case 'skipped':
            case 'pending':
            case 'todo':
                return TestStatus.SKIPPED;
            case 'focused':
                return TestStatus.QUEUED;
            default:
                console.error(`Unknown status: ${status}`);
                return TestStatus.ERROR;
        }
    }

    get testPath(): string[] {
        return [
            ...this._assertionResult.ancestorTitles,
            this._assertionResult.title
        ];
    }

    get history(): TestStepCompressed[] {
        return [];
    }

    get timestamp(): number {
        return this._testResult.perfStats.start;
    }

    get url(): string {
        return '';
    }

    get duration(): number {
        return this._assertionResult.duration ?? 0;
    }
}
