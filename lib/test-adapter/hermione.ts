import _ from 'lodash';
import fs from 'fs-extra';
import path from 'path';

import {getCommandsHistory} from '../history-utils';
import {ERROR_DETAILS_PATH, TestStatus} from '../constants';
import {mkTestId, wrapLinkByTag} from '../common-utils';
import * as utils from '../server-utils';
import {
    AssertViewResult,
    ErrorDetails,
    ImageBase64,
    ImageInfoFull,
    HermioneTestResult, HermioneSuite, TestError
} from '../types';
import {ImagesInfoFormatter} from '../image-handler';
import {ReporterTestResult} from './index';
import {getSuitePath} from '../plugin-utils';

const testsAttempts: Map<string, number> = new Map();

const getSkipComment = (suite: HermioneTestResult | HermioneSuite): string | null | undefined => {
    return suite.skipReason || suite.parent && getSkipComment(suite.parent);
};

const wrapSkipComment = (skipComment: string | null | undefined): string => {
    return skipComment ? wrapLinkByTag(skipComment) : 'Unknown reason';
};

export interface HermioneTestAdapterOptions {
    status: TestStatus;
    imagesInfoFormatter: ImagesInfoFormatter;
}

export class HermioneTestAdapter implements ReporterTestResult {
    private _imagesInfoFormatter: ImagesInfoFormatter;
    private _testResult: HermioneTestResult;
    private _testId: string;
    private _errorDetails: ErrorDetails | null;
    private _timestamp: number | undefined;
    private _attempt: number;
    private _status: TestStatus;

    static create<T extends HermioneTestAdapter>(this: new (testResult: HermioneTestResult, options: HermioneTestAdapterOptions) => T, testResult: HermioneTestResult, options: HermioneTestAdapterOptions): T {
        return new this(testResult, options);
    }

    constructor(testResult: HermioneTestResult, {status, imagesInfoFormatter}: HermioneTestAdapterOptions) {
        this._imagesInfoFormatter = imagesInfoFormatter;
        this._testResult = testResult;
        this._testId = mkTestId(testResult.fullTitle(), testResult.browserId);
        this._errorDetails = null;
        this._timestamp = this._testResult.timestamp;
        this._status = status;

        const browserVersion = _.get(this._testResult, 'meta.browserVersion', this._testResult.browserVersion);

        _.set(this._testResult, 'meta.browserVersion', browserVersion);

        if (utils.shouldUpdateAttempt(status)) {
            testsAttempts.set(this._testId, _.isUndefined(testsAttempts.get(this._testId)) ? 0 : testsAttempts.get(this._testId) as number + 1);
        }

        this._attempt = testsAttempts.get(this._testId) || 0;
    }

    image?: boolean;

    get fullName(): string {
        return this._testResult.fullTitle();
    }

    get skipReason(): string {
        return wrapSkipComment(getSkipComment(this._testResult));
    }

    get status(): TestStatus {
        return this._status;
    }

    get sessionId(): string {
        return this._testResult.sessionId || 'unknown session id';
    }

    get browserId(): string {
        return this._testResult.browserId;
    }

    get imagesInfo(): ImageInfoFull[] | undefined {
        return this._imagesInfoFormatter.getImagesInfo(this);
    }

    get origAttempt(): number | undefined {
        return this._testResult.origAttempt;
    }

    get attempt(): number {
        return this._attempt;
    }

    set attempt(attemptNum: number) {
        testsAttempts.set(this._testId, attemptNum);
        this._attempt = attemptNum;
    }

    get assertViewResults(): AssertViewResult[] {
        return this._testResult.assertViewResults || [];
    }

    get history(): string[] {
        return getCommandsHistory(this._testResult.history) as string[];
    }

    get error(): undefined | TestError {
        return this._testResult.err;
    }

    get imageDir(): string {
        // TODO: remove toString after publish major version
        return this._testResult.id.toString();
    }

    get state(): {name: string} {
        return {name: this._testResult.title};
    }

    get testPath(): string[] {
        return getSuitePath(this._testResult.parent).concat(this._testResult.title);
    }

    get id(): string {
        return this.testPath.concat(this.browserId, this.attempt.toString()).join(' ');
    }

    get isUpdated(): boolean | undefined {
        return this._testResult.updated;
    }

    get screenshot(): ImageBase64 | undefined {
        return _.get(this._testResult, 'err.screenshot');
    }

    get description(): string | undefined {
        return this._testResult.description;
    }

    get meta(): Record<string, unknown> {
        return this._testResult.meta;
    }

    get errorDetails(): ErrorDetails | null {
        if (!_.isNil(this._errorDetails)) {
            return this._errorDetails;
        }

        const details = _.get(this._testResult, 'err.details', null);

        if (details) {
            this._errorDetails = {
                title: details.title || 'error details',
                data: details.data,
                filePath: `${ERROR_DETAILS_PATH}/${utils.getDetailsFileName(
                    this._testResult.id, this._testResult.browserId, this.attempt
                )}`
            };
        } else {
            this._errorDetails = null;
        }

        return this._errorDetails;
    }

    get file(): string {
        return path.relative(process.cwd(), this._testResult.file);
    }

    get url(): string | undefined {
        return this._testResult.meta.url as string | undefined;
    }

    get multipleTabs(): boolean {
        return true;
    }

    get timestamp(): number | undefined {
        return this._timestamp;
    }

    set timestamp(timestamp) {
        if (!_.isNumber(this._timestamp)) {
            this._timestamp = timestamp;
        }
    }

    async saveErrorDetails(reportPath: string): Promise<void> {
        if (!this.errorDetails) {
            return;
        }

        const detailsFilePath = path.resolve(reportPath, this.errorDetails.filePath);
        const detailsData = _.isObject(this.errorDetails.data)
            ? JSON.stringify(this.errorDetails.data, null, 2)
            : this.errorDetails.data;

        await utils.makeDirFor(detailsFilePath);
        await fs.writeFile(detailsFilePath, detailsData);
    }

    decreaseAttemptNumber(): void {
        const testId = mkTestId(this._testResult.fullTitle(), this.browserId);
        const currentTestAttempt = testsAttempts.get(testId) as number;
        const previousTestAttempt = currentTestAttempt - 1;

        if (previousTestAttempt) {
            testsAttempts.set(testId, previousTestAttempt);
        } else {
            testsAttempts.delete(testId);
        }
    }
}
