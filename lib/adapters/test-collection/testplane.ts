import {TestplaneTestAdapter} from '../test/testplane';
import type {TestCollectionAdapter} from './';
import type {Config, TestCollection} from 'testplane';

export class TestplaneTestCollectionAdapter implements TestCollectionAdapter {
    private _testCollection: TestCollection;
    private _testAdapters: TestplaneTestAdapter[];
    private _hasFocusedTests: boolean;

    static create<T>(
        this: new (testCollection: TestCollection, saveHistoryMode?: Config['saveHistoryMode'], hasFocusedTests?: boolean) => T,
        testCollection: TestCollection,
        saveHistoryMode?: Config['saveHistoryMode'],
        hasFocusedTests = false
    ): T {
        return new this(testCollection, saveHistoryMode, hasFocusedTests);
    }

    constructor(testCollection: TestCollection, saveHistoryMode?: Config['saveHistoryMode'], hasFocusedTests = false) {
        this._testCollection = testCollection;
        this._hasFocusedTests = hasFocusedTests;

        this._testAdapters = this._testCollection.mapTests(test => TestplaneTestAdapter.create(test, saveHistoryMode));
    }

    get original(): TestCollection {
        return this._testCollection;
    }

    get tests(): TestplaneTestAdapter[] {
        return this._testAdapters;
    }

    get hasFocusedTests(): boolean {
        return this._hasFocusedTests;
    }
}
