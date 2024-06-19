import {TestplaneTestAdapter} from '../../test-adapter/testplane';
import {TestStatus, UNKNOWN_ATTEMPT} from '../../constants';

import type {TestAdapter} from './index';
import type {Test, Suite} from 'testplane';
import type {ReporterTestResult} from '../../test-adapter';

// TODO: add Adapter
// TODO: should implement parent field ???
export class TestplaneTest implements TestAdapter {
    private _test: Test;

    static create<T extends TestplaneTest>(this: new (test: Test) => T, test: Test): T {
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

    get file(): string {
        return this._test.file;
    }

    get pending(): boolean {
        return this._test.pending;
    }

    get disabled(): boolean {
        return this._test.disabled;
    }

    get silentSkip(): boolean {
        return this._test.silentSkip;
    }

    get skipReason(): string {
        return this._test.skipReason;
    }

    // TODO: fix type
    get browserId(): string {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this._test.browserId!;
    }

    // TODO: fix type
    get browserVersion(): string {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this._test.browserVersion!;
    }

    fullTitle(): string {
        return this._test.fullTitle();
    }

    // disableTest(): void {
    //     this._test.disabled = true;
    // }

    // enableTest(): void {
    //     this._test.disabled = false;
    // }

    clone(): TestplaneTest {
        return TestplaneTest.create(this._test.clone());
    }

    isSilentlySkipped(runnable: Test | Suite = this._test): boolean {
        return Boolean(runnable.silentSkip || runnable.parent && this.isSilentlySkipped(runnable.parent));
    }

    formatTestResult(status: TestStatus, attempt: number = UNKNOWN_ATTEMPT): ReporterTestResult {
        return new TestplaneTestAdapter(this._test, {attempt, status});
    }
}

// export const formatTestResult = (
//     rawResult: TestplaneTest | TestplaneTestResult,
//     status: TestStatus,
//     attempt: number = UNKNOWN_ATTEMPT
// ): ReporterTestResult => {
//     return new TestplaneTestAdapter(rawResult, {attempt, status});
// };
