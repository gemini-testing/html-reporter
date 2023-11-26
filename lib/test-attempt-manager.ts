import _ from 'lodash';
import {ReporterTestResult} from './test-adapter';
import {IDLE, RUNNING, SKIPPED, TestStatus, UPDATED} from './constants';

type TestSpec = Pick<ReporterTestResult, 'fullName' | 'browserId'>

const INVALID_ATTEMPT = -1;

export class TestAttemptManager {
    private _attemptMap: Map<string, number>;
    private _statusMap: Map<string, TestStatus[]>;

    constructor() {
        this._attemptMap = new Map();
        this._statusMap = new Map();
    }

    removeAttempt(testResult: TestSpec): number {
        const hash = this._getHash(testResult);
        let value = this._attemptMap.get(hash);

        if (_.isNil(value) || value === 0) {
            value = INVALID_ATTEMPT;
        } else {
            value -= 1;

            const statuses = this._statusMap.get(hash) as TestStatus[];
            statuses.pop();
        }

        this._attemptMap.set(hash, value);

        return value;
    }

    getCurrentAttempt(testResult: TestSpec): number {
        const hash = this._getHash(testResult);

        return this._attemptMap.get(hash) ?? INVALID_ATTEMPT;
    }

    registerAttempt(testResult: TestSpec, status: TestStatus): number {
        const hash = this._getHash(testResult);

        let attempt = this._attemptMap.get(hash);
        const statuses = this._statusMap.get(hash) ?? [];

        if (_.isNil(attempt)) {
            this._attemptMap.set(hash, 0);
            statuses.push(status);
            this._statusMap.set(hash, statuses);

            return 0;
        }

        if ([IDLE, RUNNING, SKIPPED, UPDATED].includes(_.last(statuses) as TestStatus)) {
            return attempt;
        }

        attempt += 1;
        this._attemptMap.set(hash, attempt);
        statuses.push(status);
        this._statusMap.set(hash, statuses);

        return attempt;
    }

    private _getHash(testResult: TestSpec): string {
        return `${testResult.fullName}.${testResult.browserId}`;
    }
}
