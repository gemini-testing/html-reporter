import {TestplaneTestResultAdapter} from '../test-result/testplane';
import {TestStatus, UNKNOWN_ATTEMPT} from '../../constants';

import type {TestAdapter} from './';
import type {Test, Suite} from 'testplane';
import type {ReporterTestResult} from '../test-result';

export class TestplaneTestAdapter implements TestAdapter {
    private _test: Test;

    static create<T extends TestplaneTestAdapter>(this: new (test: Test) => T, test: Test): T {
        return new this(test);
    }

    constructor(test: Test) {
        this._test = test;
    }

    get originalTest(): Test {
        return this._test;
    }

    get id(): string {
        return this._test.id;
    }

    get pending(): boolean {
        return this._test.pending;
    }

    get disabled(): boolean {
        return this._test.disabled;
    }

    get browserId(): string {
        return this._test.browserId;
    }

    fullTitle(): string {
        return this._test.fullTitle();
    }

    clone(): TestplaneTestAdapter {
        return TestplaneTestAdapter.create(this._test.clone());
    }

    isSilentlySkipped(runnable: Test | Suite = this._test): boolean {
        return Boolean(runnable.silentSkip || runnable.parent && this.isSilentlySkipped(runnable.parent));
    }

    formatTestResult(status: TestStatus, attempt: number = UNKNOWN_ATTEMPT): ReporterTestResult {
        return TestplaneTestResultAdapter.create(this._test, {attempt, status});
    }
}
