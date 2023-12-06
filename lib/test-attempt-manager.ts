import {ReporterTestResult} from './test-adapter';
import {IDLE, RUNNING, TestStatus} from './constants';

type TestSpec = Pick<ReporterTestResult, 'fullName' | 'browserId'>

interface AttemptData {
    statuses: TestStatus[];
}

export class TestAttemptManager {
    private _attempts: Map<string, AttemptData>;

    constructor() {
        this._attempts = new Map();
    }

    removeAttempt(testResult: TestSpec): number {
        const [hash, data] = this._getData(testResult);

        if (data.statuses.length > 0) {
            data.statuses.pop();
        }

        this._attempts.set(hash, data);

        return Math.max(data.statuses.length - 1, 0);
    }

    getCurrentAttempt(testResult: TestSpec): number {
        const [, data] = this._getData(testResult);

        return Math.max(data.statuses.length - 1, 0);
    }

    registerAttempt(testResult: TestSpec, status: TestStatus, index: number | null = null): number {
        const [hash, data] = this._getData(testResult);

        const isManualOverride = index !== null;
        const isLastStatusTemporary = [IDLE, RUNNING].includes(data.statuses.at(-1) as TestStatus);
        const shouldReplace = Number(isManualOverride || isLastStatusTemporary);

        data.statuses.splice(index ?? data.statuses.length - shouldReplace, shouldReplace, status);

        this._attempts.set(hash, data);

        return Math.max(data.statuses.length - 1, 0);
    }

    private _getHash(testResult: TestSpec): string {
        return `${testResult.fullName}.${testResult.browserId}`;
    }

    private _getData(testResult: TestSpec): [string, AttemptData] {
        const hash = this._getHash(testResult);

        return [hash, this._attempts.get(hash) ?? {statuses: []}];
    }
}
