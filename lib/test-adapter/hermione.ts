import _ from 'lodash';
import fs from 'fs-extra';
import path from 'path';

import {SuiteAdapter} from '../suite-adapter';
import {getSuitePath} from '../plugin-utils';
import {getCommandsHistory} from '../history-utils';
import {ERROR_DETAILS_PATH, TestStatus} from '../constants';
import {getError, isImageDiffError, mkTestId} from '../common-utils';
import * as utils from '../server-utils';
import {
    AssertViewResult,
    ErrorDetails,
    ImageBase64,
    ImageData,
    ImageInfoFull,
    TestResult
} from '../types';
import {ImagesInfoFormatter} from '../image-handler';

const testsAttempts: Map<string, number> = new Map();

interface PrepareTestResultData {
    name: string;
    suitePath: string[];
    browserId: string;
}

export interface TestAdapterOptions {
    status: TestStatus;
    imagesInfoFormatter: ImagesInfoFormatter;
}

export class TestAdapter {
    private _imagesInfoFormatter: ImagesInfoFormatter;
    private _testResult: TestResult;
    private _suite: SuiteAdapter;
    private _testId: string;
    private _errorDetails: ErrorDetails | null;
    private _timestamp: number;
    private _attempt: number;

    static create<T extends TestAdapter>(this: new (testResult: TestResult, options: TestAdapterOptions) => T, testResult: TestResult, options: TestAdapterOptions): T {
        return new this(testResult, options);
    }

    constructor(testResult: TestResult, {status, imagesInfoFormatter}: TestAdapterOptions) {
        this._imagesInfoFormatter = imagesInfoFormatter;
        this._testResult = testResult;
        this._suite = SuiteAdapter.create(this._testResult);
        this._testId = mkTestId(testResult.fullTitle(), testResult.browserId);
        this._errorDetails = null;
        this._timestamp = this._testResult.timestamp;

        const browserVersion = _.get(this._testResult, 'meta.browserVersion', this._testResult.browserVersion);

        _.set(this._testResult, 'meta.browserVersion', browserVersion);

        if (utils.shouldUpdateAttempt(status)) {
            testsAttempts.set(this._testId, _.isUndefined(testsAttempts.get(this._testId)) ? 0 : testsAttempts.get(this._testId) as number + 1);
        }

        this._attempt = testsAttempts.get(this._testId) || 0;
    }

    image?: boolean;

    get suite(): SuiteAdapter {
        return this._suite;
    }

    get sessionId(): string {
        return this._testResult.sessionId || 'unknown session id';
    }

    get browserId(): string {
        return this._testResult.browserId;
    }

    get imagesInfo(): ImageInfoFull[] | undefined {
        return this._imagesInfoFormatter.getImagesInfo(this._testResult, this.attempt);
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

    hasDiff(): boolean {
        return this.assertViewResults.some((result) => isImageDiffError(result));
    }

    get assertViewResults(): AssertViewResult[] {
        return this._testResult.assertViewResults || [];
    }

    get history(): string[] {
        return getCommandsHistory(this._testResult.history) as string[];
    }

    get error(): undefined | {message?: string; stack?: string; stateName?: string} {
        return getError(this._testResult);
    }

    get imageDir(): string {
        // TODO: remove toString after publish major version
        return this._testResult.id.toString();
    }

    get state(): {name: string} {
        return {name: this._testResult.title};
    }

    get testPath(): string[] {
        return this._suite.path.concat(this._testResult.title);
    }

    get id(): string {
        return this.testPath.concat(this.browserId, this.attempt.toString()).join(' ');
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

    getRefImg(stateName?: string): ImageData | undefined {
        return this._imagesInfoFormatter.getRefImg(this._testResult.assertViewResults, stateName);
    }

    getCurrImg(stateName?: string): ImageData | undefined {
        return this._imagesInfoFormatter.getCurrImg(this._testResult.assertViewResults, stateName);
    }

    getErrImg(): ImageBase64 | undefined {
        return this._imagesInfoFormatter.getScreenshot(this._testResult);
    }

    prepareTestResult(): PrepareTestResultData {
        const {title: name, browserId} = this._testResult;
        const suitePath = getSuitePath(this._testResult);

        return {name, suitePath, browserId};
    }

    get multipleTabs(): boolean {
        return true;
    }

    get timestamp(): number {
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
