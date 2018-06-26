'use strict';

const _ = require('lodash');
const AllTestRunner = require('./all-test-runner');
const SpecificTestRunners = {
    gemini: require('./specific-test-runner/gemini'),
    hermione: require('./specific-test-runner/hermione')
};

exports.create = (toolName, collection, tests) => {
    return _.isEmpty(tests)
        ? new AllTestRunner(collection)
        : new SpecificTestRunners[toolName](collection, tests);
};
