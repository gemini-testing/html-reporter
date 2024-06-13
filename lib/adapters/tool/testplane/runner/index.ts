import _ from 'lodash';
import type {TestCollection} from 'testplane';

import {AllTestRunner} from './all-test-runner';
import {SpecificTestRunner} from './specific-test-runner';
import type {TestRunner} from './runner';
import type {TestSpec} from '../../types';

export const createTestRunner = (collection: TestCollection, tests: TestSpec[]): TestRunner => {
    return _.isEmpty(tests)
        ? new AllTestRunner(collection)
        : new SpecificTestRunner(collection, tests);
};
