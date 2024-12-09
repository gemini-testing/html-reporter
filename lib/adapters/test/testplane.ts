import {TestplaneTestResultAdapter} from '../test-result/testplane';
import {DEFAULT_TITLE_DELIMITER, UNKNOWN_ATTEMPT} from '../../constants';

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

    get original(): Test {
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

    get silentlySkipped(): boolean {
        return isSilentlySkipped(this._test);
    }

    get browserId(): string {
        return this._test.browserId;
    }

    get fullName(): string {
        return this._test.fullTitle();
    }

    get file(): string {
        return this._test.file;
    }

    get titlePath(): string[] {
        return this._test.fullTitle().split(DEFAULT_TITLE_DELIMITER);
    }

    createTestResult(opts: CreateTestResultOpts): ReporterTestResult {
        const {status, assertViewResults, error, sessionId, meta, attempt = UNKNOWN_ATTEMPT, duration} = opts;
        const test = this._test.clone();

        [
            {key: 'assertViewResults', value: assertViewResults},
            {key: 'err', value: error},
            {key: 'sessionId', value: sessionId},
            {key: 'meta', value: meta}
        ].forEach(({key, value}) => {
            if (value) {
                // @ts-expect-error TODO: fix this assignment.
                test[key] = value;
            }
        });

        return TestplaneTestResultAdapter.create(test, {attempt, status, duration});
    }
}

function isSilentlySkipped(runnable: Test | Suite): boolean {
    return Boolean(runnable.silentSkip || runnable.parent && isSilentlySkipped(runnable.parent));
}
