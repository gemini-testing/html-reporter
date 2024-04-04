import _ from 'lodash';
import type {TestCollection} from 'testplane';

import {TestRunner, TestSpec} from './runner';
import {AllTestRunner} from './all-test-runner';
import {SpecificTestRunner} from './specific-test-runner';

export const createTestRunner = (collection: TestCollection, tests: TestSpec[]): TestRunner => {
    return _.isEmpty(tests)
        ? new AllTestRunner(collection)
        : new SpecificTestRunner(collection, tests);
};
