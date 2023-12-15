import {TestStatus} from '../constants';
import {AssertViewResult, TestError, ErrorDetails, ImageInfoFull, ImageBase64, ImageData} from '../types';
import {ReporterTestResult} from './index';
import _ from 'lodash';
import {extractErrorDetails, getTestHash} from './utils';
import {getShortMD5} from '../common-utils';

// This class is primarily useful when cloning ReporterTestResult.
// It allows to override some properties while keeping computable
// properties valid, e.g. id

export class ReporterTestAdapter implements ReporterTestResult {
    private _testResult: ReporterTestResult;
    private _errorDetails: ErrorDetails | null;

    constructor(testResult: ReporterTestResult) {
        this._testResult = testResult;
        this._errorDetails = null;
    }

    get assertViewResults(): AssertViewResult[] {
        return this._testResult.assertViewResults;
    }

    get attempt(): number {
        return this._testResult.attempt;
    }

    get browserId(): string {
        return this._testResult.browserId;
    }

    get description(): string | undefined {
        return this._testResult.description;
    }

    get error(): TestError | undefined {
        return this._testResult.error;
    }

    get errorDetails(): ErrorDetails | null {
        if (!_.isNil(this._errorDetails)) {
            return this._errorDetails;
        }

        this._errorDetails = extractErrorDetails(this);

        return this._errorDetails;
    }

    get file(): string {
        return this._testResult.file;
    }

    get fullName(): string {
        return this._testResult.fullName;
    }

    get history(): string[] {
        return this._testResult.history;
    }

    get id(): string {
        return getTestHash(this);
    }

    get imageDir(): string {
        return getShortMD5(this.fullName);
    }

    get imagesInfo(): ImageInfoFull[] | undefined {
        return this._testResult.imagesInfo;
    }

    get meta(): Record<string, unknown> {
        return this._testResult.meta;
    }

    get multipleTabs(): boolean {
        return this._testResult.multipleTabs;
    }

    get screenshot(): ImageBase64 | ImageData | null | undefined {
        return this.error?.screenshot;
    }

    get sessionId(): string {
        return this._testResult.sessionId;
    }

    get skipReason(): string | undefined {
        return this._testResult.skipReason;
    }

    get state(): {name: string;} {
        return {name: this.testPath.at(-1) as string};
    }

    get status(): TestStatus {
        return this._testResult.status;
    }

    get testPath(): string[] {
        return this._testResult.testPath;
    }

    get timestamp(): number | undefined {
        return this._testResult.timestamp;
    }

    get url(): string | undefined {
        return this._testResult.url;
    }
}
