import type {TestAdapter} from '../test';

export interface TestCollectionAdapter {
    readonly tests: TestAdapter[];
    readonly hasFocusedTests?: boolean;
}
