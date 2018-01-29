'use strict';

const Runner = require('./runner');

module.exports = class SpecificSuiteRunner extends Runner {
    constructor(collection, specificTests) {
        super(collection);
        this._specificTests = specificTests;
    }

    run(runHandler) {
        this._filter();

        return super.run(runHandler);
    }

    _filter() {
        const testsToRun = this._specificTests.map((test) => {
            return {
                suite: test.suite.path.replace(/,/g, ' '), // converting path to suite fullName
                state: test.state.name,
                browserId: test.browserId
            };
        });

        this._collection.disableAll();
        testsToRun.forEach((test) => {
            this._collection.enable(test.suite, {state: test.state, browser: test.browserId});
        });
    }
};
