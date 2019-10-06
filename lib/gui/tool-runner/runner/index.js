'use strict';

const _ = require('lodash');
const AllTestRunner = require('./all-test-runner');
const SpecificTestRunner = require('./specific-test-runner');

exports.create = (collection, tests) => {
    return _.isEmpty(tests)
        ? new AllTestRunner(collection)
        : new SpecificTestRunner(collection, tests);
};
