'use strict';

const _ = require('lodash');
const TestAdapter = require('./test-adapter');
const HermioneSuiteAdapter = require('../suite-adapter/hermione-suite-adapter.js');

module.exports = class HermioneTestResultAdapter extends TestAdapter {
    constructor(testResult, config = {}) {
        super(testResult);
        this._config = config;

        this._suite = HermioneSuiteAdapter.create(this._testResult);
    }

    get error() {
        return JSON.stringify(_.pick(this._testResult.err, 'message', 'stack', 'stateName'), null, 2);
    }

    get imageDir() {
        return this._testResult.id();
    }

    get state() {
        return {name: this._testResult.title};
    }

    get attempt() {
        if (this._testResult.retriesLeft >= 0) {
            return (this._config.retry - this._testResult.retriesLeft);
        }
    }

    get referencePath() {
        return this._testResult.err.refImagePath;
    }

    get currentPath() {
        return this._testResult.err.currentImagePath;
    }

    get screenshot() {
        return this._testResult.err.screenshot;
    }
};
