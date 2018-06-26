'use strict';

const SpecificTestRunner = require('./');
const {mkFullTitle} = require('../../hermione/utils');

module.exports = class HermioneSpecificTestRunner extends SpecificTestRunner {
    _filter() {
        this._collection.disableAll();

        this._tests.forEach((test) => {
            this._collection.enableTest(mkFullTitle(test), test.browserId);
        });
    }
};
