import {getHistory, collapseRepeatingGroups} from 'lib/adapters/test-result/testplane/history';
import {TestStepCompressed, TestStepKey} from 'lib/types';
import {getHistoryInput, getHistoryResultAll, getHistoryResultOnlyFailed} from './mocks';

type CompressedTestResult = [
    string,
    string[],
    number,
    number,
    boolean,
    boolean,
    CompressedTestResult[]?,
    number?,
];

const getHistoryList = (list: CompressedTestResult[]): TestStepCompressed[] => (
    list.map((item) => ({
        [TestStepKey.Name]: item[0],
        [TestStepKey.Args]: item[1],
        [TestStepKey.Duration]: item[2],
        [TestStepKey.TimeStart]: item[3],
        [TestStepKey.IsFailed]: item[4],
        [TestStepKey.IsGroup]: item[5],
        [TestStepKey.Children]: item[6],
        [TestStepKey.Repeat]: item[7]
    }))
);

const repeatArray = <T>(arr: T[], n: number): T[] => Array(n).fill(arr).flat();

describe('collapseRepeatingGroups', () => {
    it('collapse single repeating step', () => {
        const list: CompressedTestResult[] = [
            ['pause', ['1000'], 1000, 0, false, false],
            ['pause', ['1000'], 1000, 0, false, false],
            ['pause', ['1000'], 1000, 0, false, false]
        ];
        const result = collapseRepeatingGroups(getHistoryList(list));

        expect(result).toEqual([{
            [TestStepKey.Name]: 'pause',
            [TestStepKey.Args]: ['1000'],
            [TestStepKey.Duration]: 3000,
            [TestStepKey.TimeStart]: 0,
            [TestStepKey.IsFailed]: false,
            [TestStepKey.IsGroup]: false,
            [TestStepKey.Repeat]: 3
        }]);
    });

    it('collapse repeating group', () => {
        const list: CompressedTestResult[] = repeatArray(
            [
                ['pause', ['1000'], 1000, 0, false, false],
                ['getText', ['body'], 10, 0, false, false],
                ['$', ['h1'], 10, 0, false, false]
            ],
            4
        );
        const result = collapseRepeatingGroups(getHistoryList(list));

        expect(result).toEqual([{
            [TestStepKey.Name]: 'Repeated group',
            [TestStepKey.Args]: ['3 items'],
            [TestStepKey.Duration]: 4080,
            [TestStepKey.TimeStart]: 0,
            [TestStepKey.IsFailed]: false,
            [TestStepKey.IsGroup]: true,
            [TestStepKey.Repeat]: 4,
            [TestStepKey.Children]: [
                {
                    [TestStepKey.Name]: 'pause',
                    [TestStepKey.Args]: ['1000'],
                    [TestStepKey.Duration]: 1000,
                    [TestStepKey.TimeStart]: 0,
                    [TestStepKey.IsFailed]: false,
                    [TestStepKey.IsGroup]: false,
                    [TestStepKey.Children]: undefined,
                    [TestStepKey.Repeat]: -1
                },
                {
                    [TestStepKey.Name]: 'getText',
                    [TestStepKey.Args]: ['body'],
                    [TestStepKey.Duration]: 10,
                    [TestStepKey.TimeStart]: 0,
                    [TestStepKey.IsFailed]: false,
                    [TestStepKey.IsGroup]: false,
                    [TestStepKey.Children]: undefined,
                    [TestStepKey.Repeat]: -1
                },
                {
                    [TestStepKey.Name]: '$',
                    [TestStepKey.Args]: ['h1'],
                    [TestStepKey.Duration]: 10,
                    [TestStepKey.TimeStart]: 0,
                    [TestStepKey.IsFailed]: false,
                    [TestStepKey.IsGroup]: false,
                    [TestStepKey.Children]: undefined,
                    [TestStepKey.Repeat]: -1
                }
            ]
        }]);
    });

    it('don\'t collapse if repeat less than minRepeats (3)', () => {
        const list: CompressedTestResult[] = repeatArray(
            [
                ['pause', ['1000'], 1000, 0, false, false],
                ['getText', ['body'], 10, 0, false, false],
                ['$', ['h1'], 10, 0, false, false]
            ],
            2
        );
        const result = collapseRepeatingGroups(getHistoryList(list));

        expect(result.length).toEqual(list.length);
    });
});

describe('getHistory', () => {
    it('saveHistoryMode: all', () => {
        expect(getHistory(getHistoryInput, 'all')).toEqual(getHistoryResultAll);
    });

    it('saveHistoryMode: onlyFailed', () => {
        expect(getHistory(getHistoryInput, 'onlyFailed')).toEqual(getHistoryResultOnlyFailed);
    });
});
