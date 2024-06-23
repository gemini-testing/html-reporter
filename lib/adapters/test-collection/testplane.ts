import {TestplaneTestAdapter} from '../test/testplane';
import type {TestCollectionAdapter, TestsCallback} from './index';
import type {TestCollection} from 'testplane';

export class TestplaneTestCollectionAdapter implements TestCollectionAdapter {
    private _originalTestCollection: TestCollection;

    static create<T>(
        this: new (testCollection: TestCollection) => T,
        testCollection: TestCollection
    ): T {
        return new this(testCollection);
    }

    constructor(testCollection: TestCollection) {
        this._originalTestCollection = testCollection;
    }

    get originalTestCollection(): TestCollection {
        return this._originalTestCollection;
    }

    eachTest(cb: TestsCallback): void {
        this._originalTestCollection.eachTest((test, browserId) => cb(TestplaneTestAdapter.create(test), browserId));
    }
}
