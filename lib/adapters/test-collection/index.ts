import type {TestAdapter} from '../test';

export type TestsCallback<T = void> = (test: TestAdapter, browserId: string) => T;

export interface TestCollectionAdapter {
    eachTest(cb: TestsCallback): void;
}
