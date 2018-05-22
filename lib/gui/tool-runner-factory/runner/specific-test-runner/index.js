'use strict';

const Runner = require('../runner');

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
        throw new Error('Method must be implemented in child classes');
    }
};
