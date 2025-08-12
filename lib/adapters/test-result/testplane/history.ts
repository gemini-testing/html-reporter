import {TestStepKey, TestStepCompressed, TestplaneSuite, TestplaneTestResult} from '../../../types';
import type {Config} from 'testplane';

export const getSkipComment = (suite: TestplaneTestResult | TestplaneSuite): string | null | undefined => (
    suite.skipReason || suite.parent && getSkipComment(suite.parent)
);

export const wrapSkipComment = (skipComment: string | null | undefined): string => (
    skipComment ?? 'Unknown reason'
);

const testItemsAreTheSame = (a: TestStepCompressed, b: TestStepCompressed): boolean => (
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

export const getTotalTime = (items: TestStepCompressed[], start: number, size: number): number => {
    let total = 0;

    for (let i = start; i < (start + size); i++) {
        if (items[i] && items[i][TestStepKey.Duration]) {
            total += items[i][TestStepKey.Duration];
        }
    }

    return total;
};

export const getItemAverageTime = (
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

export const MIN_REPEATS = 3; // Min count of repeats elements of group elements for squash

export const collapseRepeatingGroups = (
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

                if (!arraysEqual(group, nextGroup, testItemsAreTheSame)) {
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
                        testItemsAreTheSame
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

export const getHistory = (
    history: TestplaneTestResult['history'] | undefined,
    saveHistoryMode: Config['saveHistoryMode'] = 'all'
): TestStepCompressed[] => (
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

            if (
                step[TestStepKey.Children] && (
                    (step[TestStepKey.IsGroup] && saveHistoryMode === 'all') ||
                    (step[TestStepKey.IsFailed] && (saveHistoryMode === 'all' || saveHistoryMode === 'onlyFailed'))
                )
            ) {
                result[TestStepKey.Children] = getHistory(step[TestStepKey.Children], saveHistoryMode);
            }

            return result;
        }) ?? [],
        MIN_REPEATS
    )
);
