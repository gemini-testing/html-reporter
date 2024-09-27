import {createSelector} from 'reselect';
import {getBrowsersState, getResults} from '@/static/new-ui/store/selectors';
import {TestStatus} from '@/constants';

export interface StatusCounts {
    success: number;
    fail: number;
    skipped: number;
    total: number;
    retried: number;
    retries: number;
    idle: number;
}

export const getStatusCounts = createSelector(
    [getResults, getBrowsersState],
    (results, browsersState) => {
        const latestAttempts: Record<string, {attempt: number; status: string, timestamp: number}> = {};
        const retriedTests = new Set<string>();

        let retries = 0;
        Object.values(results).forEach(result => {
            const {parentId: testId, attempt, status, timestamp} = result;
            if (!browsersState[testId].shouldBeShown && !browsersState[testId].isHiddenBecauseOfStatus) {
                return;
            }
            if (attempt > 0) {
                retriedTests.add(testId);
            }
            if (!latestAttempts[testId] || latestAttempts[testId].timestamp < timestamp) {
                retries -= latestAttempts[testId]?.attempt ?? 0;
                retries += attempt;

                latestAttempts[testId] = {attempt, status, timestamp};
            }
        });

        const counts: StatusCounts = {
            success: 0,
            fail: 0,
            skipped: 0,
            total: Object.keys(latestAttempts).length,
            retried: retriedTests.size,
            retries,
            idle: 0
        };

        Object.values(latestAttempts).forEach(({status: resultStatus}) => {
            const status = resultStatus === TestStatus.ERROR ? 'fail' : resultStatus;
            if (Object.prototype.hasOwnProperty.call(counts, status)) {
                counts[status as keyof StatusCounts]++;
            }
        });

        return counts;
    }
);
