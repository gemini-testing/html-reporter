import _ from 'lodash';
import {DB_COLUMN_INDEXES, TestStatus, DEFAULT_TITLE_DELIMITER} from '../../constants';
import {
    AssertViewResult,
    TestError,
    ErrorDetails,
    ImageInfoFull,
    ImageBase64,
    ImageFile,
    RawSuitesRow, TestStepCompressed, Attachment
} from '../../types';
import {ReporterTestResult} from './index';
import {Writable} from 'type-fest';
import {getTestHash} from '../../common-utils';

const tryParseJson = (json: string): unknown | undefined => {
    try {
        return JSON.parse(json);
    } catch {
        return undefined;
    }
};

export class SqliteTestResultAdapter implements ReporterTestResult {
    private _testResult: RawSuitesRow;
    private _parsedTestResult: Writable<Partial<ReporterTestResult>>;

    constructor(testResult: RawSuitesRow, attempt: number) {
        this._testResult = testResult;
        this._parsedTestResult = {attempt};
    }

    get assertViewResults(): AssertViewResult[] {
        // TODO: try to restore assertViewResults from imagesInfo
        return [];
    }

    get attempt(): number {
        return this._parsedTestResult.attempt as number;
    }

    get browserId(): string {
        return this._testResult[DB_COLUMN_INDEXES.name];
    }

    get description(): string | undefined {
        return this._testResult[DB_COLUMN_INDEXES.description] ?? undefined;
    }

    get error(): TestError | undefined {
        if (!_.has(this._parsedTestResult, 'error')) {
            this._parsedTestResult.error = tryParseJson(this._testResult[DB_COLUMN_INDEXES.error]) as TestError | undefined;
        }

        return this._parsedTestResult.error;
    }

    get errorDetails(): ErrorDetails | null {
        // TODO: implement returning error details
        return null;
    }

    get file(): string {
        if (!_.has(this._parsedTestResult, 'meta')) {
            this._parsedTestResult.meta = tryParseJson(this._testResult[DB_COLUMN_INDEXES.metaInfo]) as Record<string, unknown>;
        }

        return this._parsedTestResult.meta?.file as string;
    }

    get fullName(): string {
        if (!_.has(this._parsedTestResult, 'fullName')) {
            this._parsedTestResult.fullName = this.testPath.join(DEFAULT_TITLE_DELIMITER);
        }

        return this._parsedTestResult.fullName as string;
    }

    get history(): TestStepCompressed[] {
        if (!_.has(this._parsedTestResult, 'history')) {
            this._parsedTestResult.history = tryParseJson(this._testResult[DB_COLUMN_INDEXES.history]) as TestStepCompressed[];
        }

        return this._parsedTestResult.history as TestStepCompressed[];
    }

    get id(): string {
        return this.testPath.concat(this.browserId, this.attempt.toString()).join(' ');
    }

    get imageDir(): string {
        return getTestHash(this);
    }

    get imagesInfo(): ImageInfoFull[] {
        if (!_.has(this._parsedTestResult, 'imagesInfo')) {
            this._parsedTestResult.imagesInfo = tryParseJson(this._testResult[DB_COLUMN_INDEXES.imagesInfo]) as ImageInfoFull[];
        }

        return this._parsedTestResult.imagesInfo as ImageInfoFull[];
    }

    get meta(): Record<string, unknown> {
        if (!_.has(this._parsedTestResult, 'meta')) {
            this._parsedTestResult.meta = tryParseJson(this._testResult[DB_COLUMN_INDEXES.metaInfo]) as Record<string, unknown> ?? {};
        }

        return this._parsedTestResult.meta as Record<string, unknown>;
    }

    get multipleTabs(): boolean {
        return Boolean(this._testResult[DB_COLUMN_INDEXES.multipleTabs]);
    }

    get screenshot(): ImageBase64 | ImageFile | null | undefined {
        return this.error?.screenshot;
    }

    get sessionId(): string {
        if (!_.has(this._parsedTestResult, 'meta')) {
            this._parsedTestResult.meta = tryParseJson(this._testResult[DB_COLUMN_INDEXES.metaInfo]) as Record<string, unknown>;
        }

        return this._parsedTestResult.meta?.sessionId as string;
    }

    get skipReason(): string | undefined {
        return this._testResult[DB_COLUMN_INDEXES.skipReason];
    }

    get state(): { name: string; } {
        return {name: this.testPath.at(-1) as string};
    }

    get status(): TestStatus {
        return this._testResult[DB_COLUMN_INDEXES.status] as TestStatus;
    }

    get testPath(): string[] {
        if (!_.has(this._parsedTestResult, 'testPath')) {
            this._parsedTestResult.testPath = tryParseJson(this._testResult[DB_COLUMN_INDEXES.suitePath]) as string[];
        }

        return this._parsedTestResult.testPath as string[];
    }

    get timestamp(): number {
        return Number(this._testResult[DB_COLUMN_INDEXES.timestamp]);
    }

    get url(): string | undefined {
        return this._testResult[DB_COLUMN_INDEXES.suiteUrl];
    }

    get duration(): number {
        return this._testResult[DB_COLUMN_INDEXES.duration];
    }

    get attachments(): Attachment[] {
        if (!_.has(this._parsedTestResult, 'attachments')) {
            this._parsedTestResult.attachments = tryParseJson(this._testResult[DB_COLUMN_INDEXES.attachments]) as Attachment[];
        }

        return this._parsedTestResult.attachments as Attachment[];
    }
}
