import {PlaywrightTestAdapter, type PwtRawTest} from '../test/playwright';
import type {TestCollectionAdapter, TestsCallback} from './index';

export class PlaywrightTestCollectionAdapter implements TestCollectionAdapter {
    private _tests: PwtRawTest[];

    static create<T>(
        this: new (tests: PwtRawTest[]) => T,
        tests: PwtRawTest[]
    ): T {
        return new this(tests);
    }

    constructor(tests: PwtRawTest[]) {
        this._tests = tests;
    }

    eachTest(cb: TestsCallback): void {
        for (const test of this._tests) {
            cb(PlaywrightTestAdapter.create(test), test.browserName);
        }
    }
}
