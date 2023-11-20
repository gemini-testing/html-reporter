import type {TestCollection} from 'hermione';
import {BaseRunner} from './runner';

export class AllTestRunner extends BaseRunner {
    override run<U>(runHandler: (testCollection: TestCollection) => U): U {
        this._collection.enableAll();

        return super.run(runHandler);
    }
}
