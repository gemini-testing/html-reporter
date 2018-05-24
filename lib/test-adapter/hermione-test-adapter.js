'use strict';

const _ = require('lodash');
const TestAdapter = require('./test-adapter');
const HermioneSuiteAdapter = require('../suite-adapter/hermione-suite-adapter.js');
const {IMAGE_DIFF_ERROR} = require('../constants/errors').getHermioneErrors();
const {getSuitePath} = require('../plugin-utils').getHermioneUtils();

module.exports = class HermioneTestResultAdapter extends TestAdapter {
    constructor(testResult, tool) {
        super(testResult);
        this._tool = tool;

        this._suite = HermioneSuiteAdapter.create(this._testResult);
    }

    saveDiffTo(...args) {
        return (this._firstAssertViewFail || this._testResult.err).saveDiffTo(...args);
    }

    hasDiff() {
        return this._firstAssertViewFail
            ? this._firstAssertViewFail instanceof this._tool.errors.ImageDiffError
            : _.get(this._testResult, 'err.type') === IMAGE_DIFF_ERROR;
    }

    // hack which should be removed when html-reporter is able to show all assert view fails for one test
    get _firstAssertViewFail() {
        return _.find(this._testResult.assertViewResults, (result) => result instanceof Error);
    }

    get error() {
        return _.pick(this._firstAssertViewFail || this._testResult.err, ['message', 'stack', 'stateName']);
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

        const {retry} = this._tool.config.forBrowser(this._testResult.browserId);
        return this._testResult.retriesLeft >= 0
            ? retry - this._testResult.retriesLeft - 1
            : retry;
    }

    // for correct determine image paths in gui
    set attempt(attemptNum) {
        this._testResult.attempt = attemptNum;
    }

    get referencePath() {
        return this._firstAssertViewFail
            ? _.get(this._firstAssertViewFail, 'refImagePath')
            : _.get(this._testResult, 'err.refImagePath');
    }

    get currentPath() {
        return this._firstAssertViewFail
            ? _.get(this._firstAssertViewFail, 'currentImagePath')
            : _.get(this._testResult, 'err.currentImagePath');
    }

    get screenshot() {
        return _.get(this._testResult, 'err.screenshot');
    }

    get assertViewState() {
        return this._firstAssertViewFail
            ? _.get(this._firstAssertViewFail, 'stateName')
            : _.get(this._testResult, 'err.stateName');
    }

    get description() {
        return this._testResult.description;
    }

    get meta() {
        return this._testResult.meta;
    }

    prepareTestResult() {
        const {title: name, browserId} = this._testResult;
        const suitePath = getSuitePath(this._testResult);

        return {name, suitePath, browserId};
    }
};
