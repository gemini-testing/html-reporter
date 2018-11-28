'use strict';
var _ = require('lodash');
var AllTestRunner = require('./all-test-runner');
var SpecificTestRunners = {
    gemini: require('./specific-test-runner/gemini'),
    hermione: require('./specific-test-runner/hermione')
};
exports.create = function (toolName, collection, tests) {
    return _.isEmpty(tests)
        ? new AllTestRunner(collection)
        : new SpecificTestRunners[toolName](collection, tests);
};
//# sourceMappingURL=index.js.map