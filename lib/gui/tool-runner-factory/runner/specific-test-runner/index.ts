'use strict';

const Runner = require('../runner');
import {ISuite} from 'typings/suite-adapter';

module.exports = class SpecificTestRunner extends Runner {
    constructor(collection: any, tests: ISuite) {
        super(collection);

        this._tests = tests;
    }

    run(runHandler: () => any) {
        this._filter();

        return super.run(runHandler);
    }

    _filter() {
        throw new Error('Method must be implemented in child classes');
    }
};
