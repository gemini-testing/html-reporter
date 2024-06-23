import {TestplaneTestAdapter} from '../test/testplane';
import type {TestCollectionAdapter} from './index';
import type {TestCollection} from 'testplane';

export class TestplaneTestCollectionAdapter implements TestCollectionAdapter {
    private _testCollection: TestCollection;
    private _testAdapters: TestplaneTestAdapter[];

    static create<T>(
        this: new (testCollection: TestCollection) => T,
        testCollection: TestCollection
    ): T {
        return new this(testCollection);
    }

    constructor(testCollection: TestCollection) {
        this._testCollection = testCollection;
        this._testAdapters = this._testCollection.mapTests(test => TestplaneTestAdapter.create(test));
    }

    get original(): TestCollection {
        return this._testCollection;
    }

    get tests(): TestplaneTestAdapter[] {
        return this._testAdapters;
    }
}
