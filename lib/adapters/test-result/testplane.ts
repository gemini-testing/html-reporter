import path from 'path';
import _ from 'lodash';
import type Testplane from 'testplane';
import type {Test as TestplaneTest} from 'testplane';
import {ValueOf} from 'type-fest';

import {ERROR, FAIL, SUCCESS, TestStatus, UNKNOWN_SESSION_ID, UPDATED} from '../../constants';
import {
    getError,
    hasUnrelatedToScreenshotsErrors,
    isImageDiffError,
    isInvalidRefImageError,
    isNoRefImageError
} from '../../common-utils';
import {
    Attachment,
    ErrorDetails,
    ImageBase64,
    ImageFile,
    ImageInfoDiff,
    ImageInfoFull,
    ImageInfoNoRef,
    ImageInfoPageError,
    ImageInfoPageSuccess,
    ImageInfoSuccess,
    ImageInfoUpdated,
    TestError,
    TestplaneSuite,
    TestplaneTestResult,
    TestStepCompressed,
    TestStepKey
} from '../../types';
import {ReporterTestResult} from './index';
import {getSuitePath} from '../../plugin-utils';
import {extractErrorDetails} from './utils';

export const getStatus = (eventName: ValueOf<Testplane['events']>, events: Testplane['events'], testResult: TestplaneTestResult): TestStatus => {
    if (eventName === events.TEST_PASS) {
        return TestStatus.SUCCESS;
    } else if (eventName === events.TEST_PENDING) {
        return TestStatus.SKIPPED;
    } else if (eventName === events.RETRY || eventName === events.TEST_FAIL) {
        return hasUnrelatedToScreenshotsErrors(testResult.err as Error) ? TestStatus.ERROR : TestStatus.FAIL;
    } else if (eventName === events.TEST_BEGIN) {
        return TestStatus.RUNNING;
    }
    return TestStatus.IDLE;
};

const getSkipComment = (suite: TestplaneTestResult | TestplaneSuite): string | null | undefined => {
    return suite.skipReason || suite.parent && getSkipComment(suite.parent);
};

const wrapSkipComment = (skipComment: string | null | undefined): string => {
    return skipComment ?? 'Unknown reason';
};

const testItemsTheSame = (a: TestStepCompressed, b: TestStepCompressed): boolean => (
    a &&
    (!a[TestStepKey.Children] || !b[TestStepKey.Children]) &&
    (!a[TestStepKey.IsFailed] || !b[TestStepKey.IsFailed]) &&
    a[TestStepKey.Name] === b[TestStepKey.Name] &&
    a[TestStepKey.Args].join() === b[TestStepKey.Args].join()
);

const arraysEqual = <I>(a: I[], b: I[], checkFunc: (a: I, b: I) => boolean): boolean => {
    if (a.length !== b.length) {
        return false;
    }

    return a.every((val, idx) => checkFunc(val, b[idx]));
};

const getTotalTime = (items: TestStepCompressed[], start: number, size: number): number => {
    let total = 0;

    for (let i = start; i < (start + size); i++) {
        total += items[i][TestStepKey.Duration];
    }

    return total;
};

const getItemAverageTime = (
    items: TestStepCompressed[],
    start: number,
    repeat: number,
    index: number,
    groupLen: number
): number => {
    let total = 0;

    for (let i = 0; i < (repeat - 1); i++) {
        total += items[start + (i * groupLen) + index][TestStepKey.Duration];
    }

    return parseFloat((total / (repeat - 1)).toFixed(2));
};

const MIN_REPEATS = 3; // Min count of repeats elements of group elements for squash

const collapseRepeatingGroups = (
    arr: TestStepCompressed[],
    minRepeats: number = MIN_REPEATS
): TestStepCompressed[] => {
    const result: TestStepCompressed[] = [];
    let i = 0;

    while (i < arr.length) {
        let foundGroup = false;

        // max len of group can't be more that totalLen / minRepeats
        for (let groupLen = 1; groupLen <= Math.floor((arr.length - i) / minRepeats); groupLen++) {
            const group = arr.slice(i, i + groupLen);

            let allGroupsMatch = true;

            // check that group is repeated required count of times
            for (let repeat = 1; repeat < minRepeats; repeat++) {
                const nextGroupStart = i + repeat * groupLen;
                const nextGroupEnd = nextGroupStart + groupLen;

                if (nextGroupEnd > arr.length) {
                    allGroupsMatch = false;
                    break;
                }

                const nextGroup = arr.slice(nextGroupStart, nextGroupEnd);

                if (!arraysEqual(group, nextGroup, testItemsTheSame)) {
                    allGroupsMatch = false;
                    break;
                }
            }

            if (allGroupsMatch) {
                foundGroup = true;
                let repeatCount = minRepeats;

                // finding another repeats of group
                while (
                    i + groupLen * repeatCount <= arr.length &&
                    arraysEqual(
                        group,
                        arr.slice(i + groupLen * repeatCount, i + groupLen * (repeatCount + 1)),
                        testItemsTheSame
                    )
                ) {
                    repeatCount++;
                }

                const groupsTotalLen = groupLen * repeatCount;

                if (groupLen === 1) {
                    result.push({
                        ...group[0],
                        [TestStepKey.Duration]: getTotalTime(arr, i, groupsTotalLen),
                        [TestStepKey.Repeat]: groupsTotalLen
                    });
                } else {
                    result.push({
                        [TestStepKey.Name]: 'Repeated group',
                        [TestStepKey.Args]: [`${group.length} items`],
                        [TestStepKey.Duration]: getTotalTime(arr, i, groupsTotalLen),
                        [TestStepKey.TimeStart]: group[0][TestStepKey.TimeStart],
                        [TestStepKey.IsFailed]: false,
                        [TestStepKey.IsGroup]: true,
                        [TestStepKey.Children]: group.map((item, index) => ({
                            ...item,
                            [TestStepKey.Repeat]: -1, // -1 need to detect in ui that this is child of group for show ~ in duration
                            [TestStepKey.Duration]: getItemAverageTime(arr, i, repeatCount, index, groupLen)
                        })),
                        [TestStepKey.Repeat]: repeatCount
                    });
                }

                i += groupsTotalLen;
                break;
            }
        }

        if (!foundGroup) {
            result.push(arr[i]);
            i++;
        }
    }

    return result;
};

const getHistory = (history?: TestplaneTestResult['history']): TestStepCompressed[] => (
    collapseRepeatingGroups(
        history?.map((step) => {
            const result: TestStepCompressed = {
                [TestStepKey.Name]: step[TestStepKey.Name],
                [TestStepKey.Args]: step[TestStepKey.Args],
                [TestStepKey.Duration]: step[TestStepKey.Duration],
                [TestStepKey.TimeStart]: step[TestStepKey.TimeStart],
                [TestStepKey.IsFailed]: step[TestStepKey.IsFailed],
                [TestStepKey.IsGroup]: step[TestStepKey.IsGroup]
            };

            if (step[TestStepKey.Children] && (step[TestStepKey.IsGroup] || step[TestStepKey.IsFailed])) {
                result[TestStepKey.Children] = getHistory(step[TestStepKey.Children]);
            }

            return result;
        }) ?? [],
        MIN_REPEATS
    )
);

export interface TestplaneTestResultAdapterOptions {
    attempt: number;
    status: TestStatus;
    duration: number;
}

export class TestplaneTestResultAdapter implements ReporterTestResult {
    private _testResult: TestplaneTest | TestplaneTestResult;
    private _errorDetails: ErrorDetails | null;
    private _timestamp: number;
    private _attempt: number;
    private _status: TestStatus;
    private _duration: number;

    static create(
        this: new (testResult: TestplaneTest | TestplaneTestResult, options: TestplaneTestResultAdapterOptions) => TestplaneTestResultAdapter,
        testResult: TestplaneTest | TestplaneTestResult,
        options: TestplaneTestResultAdapterOptions
    ): TestplaneTestResultAdapter {
        return new this(testResult, options);
    }

    constructor(testResult: TestplaneTest | TestplaneTestResult, {attempt, status, duration}: TestplaneTestResultAdapterOptions) {
        this._testResult = testResult;
        this._errorDetails = null;
        this._timestamp = (this._testResult as TestplaneTestResult).startTime
            ?? (this._testResult as TestplaneTestResult).timestamp
            ?? Date.now();
        this._status = status;

        const browserVersion = _.get(this._testResult, 'meta.browserVersion', this._testResult.browserVersion);

        _.set(this._testResult, 'meta.browserVersion', browserVersion);

        this._attempt = attempt;
        this._duration = duration;
    }

    get fullName(): string {
        return this._testResult.fullTitle();
    }

    get skipReason(): string {
        return wrapSkipComment(getSkipComment(this._testResult as TestplaneTestResult));
    }

    get status(): TestStatus {
        return this._status;
    }

    get sessionId(): string {
        return (this._testResult as TestplaneTestResult).sessionId || UNKNOWN_SESSION_ID;
    }

    get browserId(): string {
        return this._testResult.browserId;
    }

    get imagesInfo(): ImageInfoFull[] {
        const {assertViewResults = []} = this._testResult as TestplaneTestResult;

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
            } else if (isInvalidRefImageError(assertResult)) {
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

    get history(): TestStepCompressed[] {
        return getHistory((this._testResult as TestplaneTestResult).history);
    }

    get error(): undefined | TestError {
        return (this._testResult as TestplaneTestResult).err;
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
        return (this._testResult as TestplaneTestResult).description;
    }

    get meta(): Record<string, unknown> {
        return (this._testResult as TestplaneTestResult).meta ?? {};
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
        return (this._testResult as TestplaneTestResult).meta?.url as string | undefined;
    }

    get multipleTabs(): boolean {
        return true;
    }

    get timestamp(): number {
        return this._timestamp;
    }

    set timestamp(timestamp) {
        if (!_.isNumber(this._timestamp)) {
            this._timestamp = timestamp ?? 0;
        }
    }

    get duration(): number {
        return this._duration;
    }

    get attachments(): Attachment[] {
        return [];
    }
}
