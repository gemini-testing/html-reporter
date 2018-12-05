'use strict';

import {ISuite} from 'typings/suite-adapter';

const SpecificTestRunner = require('./');

module.exports = class GeminiSpecificTestRunner extends SpecificTestRunner {
    _filter() {
        this._collection.disableAll();

        this._tests.forEach(({suite, state, browserId}: {suite: ISuite, state: any, browserId: string}) => {
            const suiteName = suite.path && suite.path.join(' ');
            this._collection.enable(suiteName, {state: state.name, browser: browserId});
        });
    }
};
