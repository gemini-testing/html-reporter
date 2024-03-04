import path from 'path';
import _ from 'lodash';
import Hermione, {Test as HermioneTest} from 'hermione';
import {ValueOf} from 'type-fest';

import {getCommandsHistory} from '../history-utils';
import {ERROR, FAIL, SUCCESS, TestStatus, UNKNOWN_SESSION_ID, UPDATED} from '../constants';
import {getError, hasFailedImages, isImageDiffError, isNoRefImageError, wrapLinkByTag} from '../common-utils';
import {
    ErrorDetails,
    HermioneSuite,
    HermioneTestResult,
    ImageBase64,
    ImageFile,
    ImageInfoDiff,
    ImageInfoFull,
    ImageInfoNoRef,
    ImageInfoPageError,
    ImageInfoPageSuccess,
    ImageInfoSuccess,
    ImageInfoUpdated,
    TestError
} from '../types';
import {ReporterTestResult} from './index';
import {getSuitePath} from '../plugin-utils';
import {extractErrorDetails} from './utils';

export const getStatus = (eventName: ValueOf<Hermione['events']>, events: Hermione['events'], testResult: HermioneTestResult): TestStatus => {
    if (eventName === events.TEST_PASS) {
        return TestStatus.SUCCESS;
    } else if (eventName === events.TEST_PENDING) {
        return TestStatus.SKIPPED;
    } else if (eventName === events.RETRY || eventName === events.TEST_FAIL) {
        return hasFailedImages(testResult.assertViewResults as ImageInfoFull[]) ? TestStatus.FAIL : TestStatus.ERROR;
    } else if (eventName === events.TEST_BEGIN) {
        return TestStatus.RUNNING;
    }
    return TestStatus.IDLE;
};

const getSkipComment = (suite: HermioneTestResult | HermioneSuite): string | null | undefined => {
    return suite.skipReason || suite.parent && getSkipComment(suite.parent);
};

const wrapSkipComment = (skipComment: string | null | undefined): string => {
    return skipComment ? wrapLinkByTag(skipComment) : 'Unknown reason';
};

export interface HermioneTestAdapterOptions {
    attempt: number;
    status: TestStatus;
}

export class HermioneTestAdapter implements ReporterTestResult {
    private _testResult: HermioneTest | HermioneTestResult;
    private _errorDetails: ErrorDetails | null;
    private _timestamp: number | undefined;
    private _attempt: number;
    private _status: TestStatus;

    static create<T extends HermioneTestAdapter>(this: new (testResult: HermioneTestResult, options: HermioneTestAdapterOptions) => T, testResult: HermioneTestResult, options: HermioneTestAdapterOptions): T {
        return new this(testResult, options);
    }

    constructor(testResult: HermioneTest | HermioneTestResult, {attempt, status}: HermioneTestAdapterOptions) {
        this._testResult = testResult;
        this._errorDetails = null;
        this._timestamp = (this._testResult as HermioneTestResult).timestamp ??
            (this._testResult as HermioneTestResult).startTime ?? Date.now();
        this._status = status;

        const browserVersion = _.get(this._testResult, 'meta.browserVersion', this._testResult.browserVersion);

        _.set(this._testResult, 'meta.browserVersion', browserVersion);

        this._attempt = attempt;
    }

    get fullName(): string {
        return this._testResult.fullTitle();
    }

    get skipReason(): string {
        return wrapSkipComment(getSkipComment(this._testResult as HermioneTestResult));
    }

    get status(): TestStatus {
        return this._status;
    }

    get sessionId(): string {
        return (this._testResult as HermioneTestResult).sessionId || UNKNOWN_SESSION_ID;
    }

    get browserId(): string {
        return this._testResult.browserId;
    }

    get imagesInfo(): ImageInfoFull[] {
        const {assertViewResults = []} = this._testResult as HermioneTestResult;

        const imagesInfo: ImageInfoFull[] = assertViewResults.map((assertResult): ImageInfoFull => {
            if (isImageDiffError(assertResult)) {
                const diffBufferImg = assertResult.diffBuffer ? {buffer: assertResult.diffBuffer as Buffer} : undefined;
                const diffImg = assertResult.diffImg ?? diffBufferImg;

                return {
                    status: FAIL,
                    stateName: assertResult.stateName,
                    refImg: assertResult.refImg,
                    actualImg: assertResult.currImg,
                    ...(diffImg ? {diffImg} : {}),
                    expectedImg: _.clone(assertResult.refImg),
                    diffClusters: assertResult.diffClusters,
                    diffOptions: assertResult.diffOpts,
                    differentPixels: assertResult.differentPixels,
                    diffRatio: assertResult.diffRatio
                } satisfies ImageInfoDiff;
            } else if (isNoRefImageError(assertResult)) {
                return {
                    status: ERROR,
                    stateName: assertResult.stateName,
                    error: _.pick(assertResult, ['message', 'name', 'stack']),
                    refImg: assertResult.refImg,
                    actualImg: assertResult.currImg
                } satisfies ImageInfoNoRef;
            } else if ((assertResult as {isUpdated?: boolean}).isUpdated) {
                return {
                    status: UPDATED,
                    stateName: assertResult.stateName,
                    refImg: assertResult.refImg,
                    expectedImg: _.clone(assertResult.refImg),
                    actualImg: (assertResult as {currImg: ImageFile}).currImg
                } satisfies ImageInfoUpdated;
            } else {
                const {currImg} = assertResult as {currImg?: ImageFile};
                return {
                    status: SUCCESS,
                    stateName: assertResult.stateName,
                    refImg: assertResult.refImg,
                    expectedImg: _.clone(assertResult.refImg),
                    ...(currImg ? {actualImg: currImg} : {})
                } satisfies ImageInfoSuccess;
            }
        });

        if (this.screenshot) {
            imagesInfo.push({
                status: _.isEmpty(getError(this.error)) ? SUCCESS : ERROR,
                actualImg: this.screenshot
            } satisfies ImageInfoPageSuccess | ImageInfoPageError as ImageInfoPageSuccess | ImageInfoPageError);
        }

        return imagesInfo;
    }

    get attempt(): number {
        return this._attempt;
    }

    get history(): string[] {
        return getCommandsHistory((this._testResult as HermioneTestResult).history) as string[];
    }

    get error(): undefined | TestError {
        return (this._testResult as HermioneTestResult).err;
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

    get screenshot(): ImageBase64 | undefined {
        return _.get(this._testResult, 'err.screenshot');
    }

    get description(): string | undefined {
        return (this._testResult as HermioneTestResult).description;
    }

    get meta(): Record<string, unknown> {
        return (this._testResult as HermioneTestResult).meta ?? {};
    }

    get errorDetails(): ErrorDetails | null {
        if (!_.isNil(this._errorDetails)) {
            return this._errorDetails;
        }

        this._errorDetails = extractErrorDetails(this);

        return this._errorDetails;
    }

    get file(): string {
        return path.relative(process.cwd(), this._testResult.file);
    }

    get url(): string | undefined {
        return (this._testResult as HermioneTestResult).meta?.url as string | undefined;
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
}
