import path from 'path';
import _ from 'lodash';

import {ReporterTestResult} from './index';
import {getShortMD5} from '../../common-utils';
import {TestStatus, DEFAULT_TITLE_DELIMITER} from '../../constants';
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

export const getStatus = (result: TestResult): TestStatus => {
    if (result.numPendingTests > 0) {
        return TestStatus.RUNNING;
    }

    if (result.numFailingTests > 0) {
        return TestStatus.FAIL;
    }

    if (result.numTodoTests > 0) {
        return TestStatus.IDLE;
    }

    return TestStatus.SUCCESS;
};

const extractErrorMessage = (result: TestResult): string => {
    return stripAnsi(
        result.testExecError?.message
        ?? result.failureMessage
        ?? ''
    );
};

const extractErrorStack = (result: TestResult): string => {
    return stripAnsi(
        result.testExecError?.stack
        ?? result.failureMessage
        ?? ''
    );
};

export class JestTestResultAdapter implements ReporterTestResult {
    private readonly _test: Test;
    private readonly _testResult: TestResult;
    private readonly _attempt: number;

    private readonly _description: string;

    static create<T extends JestTestResultAdapter>(
        this: new (test: Test, testResult: TestResult, attempt: number) => T,
        test: Test,
        testResult: TestResult,
        attempt: number
    ): T {
        return new this(test, testResult, attempt);
    }

    constructor(test: Test, testResult: TestResult, attempt: number) {
        this._test = test;
        this._testResult = testResult;

        this._attempt = attempt;

        this._description = this.createDescription();
    }

    private createDescription(): string {
        const description = this._test.context.config.displayName?.name;

        if (description) {
            return description;
        }

        return this.file;
    }

    get attempt(): number {
        return this._attempt;
    }

    get browserId(): string {
        return 'jest';
        // return this._testCase.parent.project()?.name as string;
    }

    get description(): string {
        return this._description;
    }

    get error(): TestError | undefined {
        const message = extractErrorMessage(this._testResult);

        if (message) {
            const result: TestError = {name: ErrorName.GENERAL_ERROR, message};

            const stack = extractErrorStack(this._testResult);
            if (!_.isNil(stack)) {
                result.stack = stack;
            }

            return result;
        }

        return undefined;
    }

    get errorDetails(): ErrorDetails | null {
        if (this._testResult.numFailingTests === 0) {
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
        return this.testPath.join(DEFAULT_TITLE_DELIMITER);
    }

    get history(): TestStepCompressed[] {
        return this
            ._testResult
            .testResults
            .map(result => ({
                [TestStepKey.Name]: result.title,
                [TestStepKey.Duration]: result.duration ?? 0,
                [TestStepKey.IsFailed]: result.status === 'failed',
                [TestStepKey.IsGroup]: false,
                [TestStepKey.Args]: result.failureMessages.length ? [stripAnsi(result.failureMessages[0])] : []
            }));
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
            failing: String(this._testResult.numFailingTests),
            passing: String(this._testResult.numPassingTests),
            started: new Date(this._testResult.perfStats.start).toUTCString(),
            finished: new Date(this._testResult.perfStats.end).toUTCString(),
            leaks: this._testResult.leaks ? 'Yes' : 'No',
            slow: this._testResult.perfStats.slow ? 'Yes' : 'No',
            skipped: this._testResult.skipped ? 'Yes' : 'No'
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
        return {name: this._description};
    }

    get status(): TestStatus {
        const status = getStatus(this._testResult);

        if (status === TestStatus.FAIL) {
            return TestStatus.ERROR;
        }

        return status;
    }

    get testPath(): string[] {
        // slicing because first entries are not actually test-name, but a file, etc.
        // return this._testCase.titlePath().slice(3);
        return [
            path.relative(
                process.cwd(),
                this._test.path
            )
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
