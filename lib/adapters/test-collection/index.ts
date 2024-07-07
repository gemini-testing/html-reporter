import type {TestAdapter} from '../test';

export interface TestCollectionAdapter {
    readonly tests: TestAdapter[];
}
