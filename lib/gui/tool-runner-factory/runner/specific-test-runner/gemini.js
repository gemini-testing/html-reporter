'use strict';

const SpecificTestRunner = require('./');

module.exports = class GeminiSpecificTestRunner extends SpecificTestRunner {
    _filter() {
        this._collection.disableAll();

        this._tests.forEach(({suite, state, browserId}) => {
            const suiteName = suite.path.join(' ');
            this._collection.enable(suiteName, {state: state.name, browser: browserId});
        });
    }
};
