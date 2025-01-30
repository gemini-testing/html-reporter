import path from 'path';

import {ReporterTestResult} from './index';
import {getShortMD5} from '../../common-utils';
import {TestStatus, UNKNOWN_ATTEMPT} from '../../constants';
import {ErrorName} from '../../errors';
import {
    ErrorDetails,
    ImageFile,
    ImageInfoFull,
    TestError, TestStepCompressed,
    TestStepKey
} from '../../types';
import {Test, TestResult} from '@jest/reporters';
import stripAnsi from 'strip-ansi';

type AssertionResult = TestResult['testResults'][number];

export class JestTestResultAdapter implements ReporterTestResult {
    private readonly _test: Test;
    private readonly _testResult: TestResult;
    private readonly _assertionResult: AssertionResult;

    static create<T extends JestTestResultAdapter>(
        this: new (test: Test, testResult: TestResult, attempt: number) => T,
        test: Test,
        testResult: TestResult,
        attempt: number
    ): T {
        return new this(test, testResult, attempt);
    }

    constructor(test: Test, testResult: TestResult, assertionResult: AssertionResult) {
        this._test = test;
        this._testResult = testResult;
        this._assertionResult = assertionResult;

        if (this._assertionResult.status !== 'failed') {
            return;
        }

        console.log(this._assertionResult.failureMessages);
        console.log(this._assertionResult.failureDetails);
    }

    get attempt(): number {
        return this._assertionResult.invocations ?? UNKNOWN_ATTEMPT;
    }

    get browserId(): string {
        return this._assertionResult.title;
    }

    get description(): string {
        const description = this._test.context.config.displayName?.name;

        if (description) {
            return description;
        }

        return this.file + '/' + this._assertionResult.title;
    }

    private getErrorMessage(): string | undefined {
        if (this._assertionResult.status !== 'failed') {
            return;
        }

        const details = this._assertionResult.failureDetails[0] as { message?: string } | undefined;

        if (!details || !details?.message) {
            return 'Unpredicted error, please report issue';
        }

        return stripAnsi(
            details.message
        );
    }

    private getErrorStack(): string | undefined {
        if (this._assertionResult.status !== 'failed') {
            return;
        }

        return stripAnsi(
            this._assertionResult.failureMessages.join('\n')
        );
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
        return this.testPath.join(': ');
    }

    get history(): TestStepCompressed[] {
        return [
            {
                [TestStepKey.Name]: this._assertionResult.title,
                [TestStepKey.Duration]: this._assertionResult.duration ?? 0,
                [TestStepKey.IsFailed]: this._assertionResult.status === 'failed',
                [TestStepKey.IsGroup]: false,
                [TestStepKey.Args]: this._assertionResult.failureMessages.length ? [stripAnsi(this._assertionResult.failureMessages[0])] : []
            }
        ];
    }

    get id(): string {
        return this.testPath.concat(this.browserId, this.attempt.toString()).join(' ');
    }

    get imageDir(): string {
        return getShortMD5(this.fullName);
    }

    get imagesInfo(): ImageInfoFull[] {
        return [];
    }

    get meta(): Record<string, unknown> {
        return {
            'failing in file': String(this._testResult.numFailingTests),
            'passing in file': String(this._testResult.numPassingTests),
            'file started': new Date(this._testResult.perfStats.start).toUTCString(),
            'file finished': new Date(this._testResult.perfStats.end).toUTCString(),
            'file leaks': this._testResult.leaks ? 'Yes' : 'No',
            'file slow': this._testResult.perfStats.slow ? 'Yes' : 'No',
            'file skipped': this._testResult.skipped ? 'Yes' : 'No',
            'step duration': (this._assertionResult.duration ?? 0) + 'ms'
        };
    }

    get multipleTabs(): boolean {
        return true;
    }

    get screenshot(): ImageFile | null {
        return null;
    }

    get sessionId(): string {
        // TODO: implement getting sessionId
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
                return TestStatus.SKIPPED;
            case 'pending':
                return TestStatus.RUNNING;
            case 'todo':
            case 'focused':
                return TestStatus.QUEUED;
            default:
                console.error(`Unknown status: ${status}`);
                return TestStatus.ERROR;
        }
    }

    get testPath(): string[] {
        return [
            path.relative(
                process.cwd(),
                this._test.path
            ),
            ...this._assertionResult.ancestorTitles
        ];
    }

    get timestamp(): number {
        return this._testResult.perfStats.start;
    }

    get url(): string {
        // TODO: HERMIONE-1191
        return '';
    }

    get duration(): number {
        return this._testResult.perfStats.runtime;
    }
}
