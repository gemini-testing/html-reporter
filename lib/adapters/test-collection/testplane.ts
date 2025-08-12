import {TestplaneTestAdapter} from '../test/testplane';
import type {TestCollectionAdapter} from './';
import type {Config, TestCollection} from 'testplane';

export class TestplaneTestCollectionAdapter implements TestCollectionAdapter {
    private _testCollection: TestCollection;
    private _testAdapters: TestplaneTestAdapter[];

    static create<T>(
        this: new (testCollection: TestCollection, saveHistoryMode?: Config['saveHistoryMode']) => T,
        testCollection: TestCollection,
        saveHistoryMode?: Config['saveHistoryMode']
    ): T {
        return new this(testCollection, saveHistoryMode);
    }

    constructor(testCollection: TestCollection, saveHistoryMode?: Config['saveHistoryMode']) {
        this._testCollection = testCollection;

        this._testAdapters = this._testCollection.mapTests(test => TestplaneTestAdapter.create(test, saveHistoryMode));
    }

    get original(): TestCollection {
        return this._testCollection;
    }

    get tests(): TestplaneTestAdapter[] {
        return this._testAdapters;
    }
}
