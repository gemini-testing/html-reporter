'use strict';

const _ = require('lodash');
const AllSuitesRunner = require('./all-suites-runner');
const SpecificSuitesRunner = require('./specific-suites-runner');

exports.create = (collection, specificSuites) => {
    if (_.isEmpty(specificSuites)) {
        return new AllSuitesRunner(collection);
    }
    return new SpecificSuitesRunner(collection, [].concat(specificSuites));
};
