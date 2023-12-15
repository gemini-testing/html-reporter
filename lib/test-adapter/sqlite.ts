import _ from 'lodash';
import {DB_COLUMN_INDEXES, TestStatus} from '../constants';
import {
    AssertViewResult,
    TestError,
    ErrorDetails,
    ImageInfoFull,
    ImageBase64,
    ImageData,
    RawSuitesRow
} from '../types';
import {ReporterTestResult} from './index';
import {Writable} from 'type-fest';
import {getTestHash} from './utils';

const tryParseJson = (json: string): unknown | undefined => {
    try {
        return JSON.parse(json);
    } catch {
        return undefined;
    }
};

interface SqliteTestAdapterOptions {
    titleDelimiter: string;
}

export class SqliteTestAdapter implements ReporterTestResult {
    private _testResult: RawSuitesRow;
    private _parsedTestResult: Writable<Partial<ReporterTestResult>>;
    private _titleDelimiter: string;

    constructor(testResult: RawSuitesRow, attempt: number, options: SqliteTestAdapterOptions) {
        this._testResult = testResult;

        this._parsedTestResult = {attempt};

        this._titleDelimiter = options.titleDelimiter;
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
            this._parsedTestResult.fullName = this.testPath.join(this._titleDelimiter);
        }

        return this._parsedTestResult.fullName as string;
    }

    get history(): string[] {
        if (!_.has(this._parsedTestResult, 'history')) {
            this._parsedTestResult.history = tryParseJson(this._testResult[DB_COLUMN_INDEXES.history]) as string[];
        }

        return this._parsedTestResult.history as string[];
    }

    get id(): string {
        return this.testPath.concat(this.browserId, this.attempt.toString()).join(' ');
    }

    get imageDir(): string {
        return getTestHash(this);
    }

    get imagesInfo(): ImageInfoFull[] | undefined {
        if (!_.has(this._parsedTestResult, 'imagesInfo')) {
            this._parsedTestResult.imagesInfo = tryParseJson(this._testResult[DB_COLUMN_INDEXES.imagesInfo]) as ImageInfoFull[];
        }

        return this._parsedTestResult.imagesInfo as ImageInfoFull[];
    }

    get meta(): Record<string, unknown> {
        if (!_.has(this._parsedTestResult, 'meta')) {
            this._parsedTestResult.meta = tryParseJson(this._testResult[DB_COLUMN_INDEXES.metaInfo]) as Record<string, unknown>;
        }

        return this._parsedTestResult.meta as Record<string, unknown>;
    }

    get multipleTabs(): boolean {
        return Boolean(this._testResult[DB_COLUMN_INDEXES.multipleTabs]);
    }

    get screenshot(): ImageBase64 | ImageData | null | undefined {
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

    get timestamp(): number | undefined {
        return Number(this._testResult[DB_COLUMN_INDEXES.timestamp]);
    }

    get url(): string | undefined {
        return this._testResult[DB_COLUMN_INDEXES.suiteUrl];
    }
}
