'use strict';

const _ = require('lodash');
const TestAdapter = require('./test-adapter');
const HermioneSuiteAdapter = require('../suite-adapter/hermione-suite-adapter.js');
const {IMAGE_DIFF_ERROR} = require('../constants/errors').getHermioneErrors();

module.exports = class HermioneTestResultAdapter extends TestAdapter {
    constructor(testResult, config = {}) {
        super(testResult);
        this._config = config;

        this._suite = HermioneSuiteAdapter.create(this._testResult);
    }

    saveDiffTo(...args) {
        return this._testResult.err.saveDiffTo(...args);
    }

    hasDiff() {
        return _.get(this._testResult, 'err.type') === IMAGE_DIFF_ERROR;
    }

    get error() {
        return _.pick(this._testResult.err, ['message', 'stack', 'stateName']);
    }

    get imageDir() {
        return this._testResult.id();
    }

    get state() {
        return {name: this._testResult.title};
    }

    get attempt() {
        if (this._testResult.attempt >= 0) {
            return this._testResult.attempt;
        }

        const {retry} = this._config.forBrowser(this._testResult.browserId);
        return this._testResult.retriesLeft >= 0
            ? retry - this._testResult.retriesLeft - 1
            : retry;
    }

    get referencePath() {
        return _.get(this._testResult, 'err.refImagePath');
    }

    get currentPath() {
        return _.get(this._testResult, 'err.currentImagePath');
    }

    get screenshot() {
        return _.get(this._testResult, 'err.screenshot');
    }

    get assertViewState() {
        return _.get(this._testResult, 'err.stateName');
    }

    get description() {
        return this._testResult.description;
    }
};
