import Hermione from 'hermione';
import {AsyncReturnType} from 'type-fest';

export type TestCollection = AsyncReturnType<Hermione['readTests']>

export interface TestRunner {
    run<U>(handler: (testCollection: TestCollection) => U): U;
}

export interface TestSpec {
    testName: string;
    browserName: string;
}

export class BaseRunner implements TestRunner {
    protected _collection: TestCollection;

    constructor(collection: TestCollection) {
        this._collection = collection;
    }

    run<U>(runHandler: (testCollection: TestCollection) => U): U {
        return runHandler(this._collection);
    }
}
