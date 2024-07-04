import {TestplaneTestResultAdapter} from '../test-result/testplane';
import {UNKNOWN_ATTEMPT, TESTPLANE_TITLE_DELIMITER} from '../../constants';

import type {TestAdapter, CreateTestResultOpts} from './';
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

    get file(): string {
        return this._test.file;
    }

    get title(): string {
        return this._test.title;
    }

    get titlePath(): string[] {
        return this._test.fullTitle().split(TESTPLANE_TITLE_DELIMITER);
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

    createTestResult(opts: CreateTestResultOpts): ReporterTestResult {
        const {status, assertViewResults, error, sessionId, meta, attempt = UNKNOWN_ATTEMPT} = opts;
        const test = this._test.clone();

        [
            {key: 'assertViewResults', value: assertViewResults},
            {key: 'err', value: error},
            {key: 'sessionId', value: sessionId},
            {key: 'meta', value: meta}
        ].forEach(({key, value}) => {
            if (value) {
                test[key] = value;
            }
        });

        return TestplaneTestResultAdapter.create(test, {attempt, status});
    }
}
