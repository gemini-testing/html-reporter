import {BaseRunner, TestCollection, TestSpec} from './runner';

export class SpecificTestRunner extends BaseRunner {
    private _tests: TestSpec[];

    constructor(collection: TestCollection, tests: TestSpec[]) {
        super(collection);

        this._tests = tests;
    }

    override run<U>(runHandler: (testCollection: TestCollection) => U): U {
        this._filter();

        return super.run(runHandler);
    }

    private _filter(): void {
        this._collection.disableAll();

        this._tests.forEach(({testName, browserName}) => {
            this._collection.enableTest(testName, browserName);
        });
    }
}
