import {TestplaneTest} from '../test/testplane';
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

    // TODO: how to make it faster? I don't want to create test instance on each call of `eachTest` method
    // TODO: can I use default test here which is implement TestAdapter ???
    eachTest(cb: TestsCallback): void {
        this._originalTestCollection.eachTest((test, browserId) => cb(TestplaneTest.create(test), browserId));
    }

    // enableAll(): this {
    //     this._originalTestCollection.enableAll();
    //     return this;
    // }

    // disableAll(): this {
    //     this._originalTestCollection.disableAll();
    //     return this;
    // }

    // enableTest(testName: string, browserName: string): this {
    //     this._originalTestCollection.enableTest(testName, browserName);
    //     return this;
    // }

    // disableTest(testName: string, browserName: string): this {
    //     this._originalTestCollection.disableTest(testName, browserName);
    //     return this;
    // }
}
