'use strict';

const Runner = require('./runner');

module.exports = class SpecificTestRunner extends Runner {
    constructor(collection, tests) {
        super(collection);

        this._tests = tests;
    }

    run(runHandler) {
        this._filter();

        return super.run(runHandler);
    }

    _filter() {
        this._collection.disableAll();

        this._tests.forEach(({testName, browserName}) => {
            this._collection.enableTest(testName, browserName);
        });
    }
};
