import {PlaywrightTestAdapter, type PwtRawTest} from '../test/playwright';
import type {TestCollectionAdapter} from './';

export class PlaywrightTestCollectionAdapter implements TestCollectionAdapter {
    private _testAdapters: PlaywrightTestAdapter[];

    static create<T>(
        this: new (tests: PwtRawTest[]) => T,
        tests: PwtRawTest[]
    ): T {
        return new this(tests);
    }

    constructor(tests: PwtRawTest[]) {
        this._testAdapters = tests.map(test => PlaywrightTestAdapter.create(test));
    }

    get tests(): PlaywrightTestAdapter[] {
        return this._testAdapters;
    }
}
