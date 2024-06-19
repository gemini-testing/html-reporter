import {PlaywrightTest, type PwtTest} from '../test/playwright';
import type {TestCollectionAdapter, TestsCallback} from './index';

export class PlaywrightTestCollectionAdapter implements TestCollectionAdapter {
    private _tests: PwtTest[];

    static create<T>(
        this: new (tests: PwtTest[]) => T,
        tests: PwtTest[]
    ): T {
        return new this(tests);
    }

    constructor(tests: PwtTest[]) {
        this._tests = tests;
    }

    // get originalTestCollection(): TestCollection {
    //     return this._originalTestCollection;
    // }

    eachTest(cb: TestsCallback): void {
        for (const test of this._tests) {
            cb(PlaywrightTest.create(test), test.browserName);
        }
    }
}
