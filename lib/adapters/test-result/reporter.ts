import {TestStatus} from '../../constants';
import {
    TestError,
    ErrorDetails,
    ImageInfoFull,
    ImageBase64,
    ImageFile,
    TestStepCompressed,
    Attachment
} from '../../types';
import {ReporterTestResult} from './index';
import _ from 'lodash';
import {extractErrorDetails} from './utils';
import {getShortMD5, getTestHash} from '../../common-utils';

// This class is primarily useful when cloning ReporterTestResult.
// It allows to override some properties while keeping computable
// properties valid, e.g. id

export class ReporterTestAdapter implements ReporterTestResult {
    private _testResult: ReporterTestResult;
    private _errorDetails: ErrorDetails | null;

    constructor(testResult: ReporterTestResult) {
        this._testResult = testResult;
        this._errorDetails = this._testResult.errorDetails || null;
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

    get history(): TestStepCompressed[] {
        return this._testResult.history;
    }

    get id(): string {
        return getTestHash(this);
    }

    get imageDir(): string {
        return getShortMD5(this.fullName);
    }

    get imagesInfo(): ImageInfoFull[] {
        return this._testResult.imagesInfo;
    }

    get meta(): Record<string, unknown> {
        return this._testResult.meta;
    }

    get multipleTabs(): boolean {
        return this._testResult.multipleTabs;
    }

    get screenshot(): ImageBase64 | ImageFile | null | undefined {
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

    get duration(): number {
        return this._testResult.duration;
    }

    get attachments(): Attachment[] {
        return this._testResult.attachments;
    }
}
