'use strict';

const _ = require('lodash');
const path = require('path');
const TestAdapter = require('./test-adapter');
const GeminiSuiteAdapter = require('../suite-adapter/gemini-suite-adapter');
const {getImagesFor} = require('../server-utils');
const {IDLE} = require('../constants/test-statuses');

module.exports = class GeminiTestResultAdapter extends TestAdapter {
    constructor(testResult, tool = {}) {
        super(testResult);

        this._suite = GeminiSuiteAdapter.create(this._testResult.suite, tool.config);
    }

    saveDiffTo(...args) {
        return this._testResult.saveDiffTo(...args);
    }

    hasDiff() {
        return this._testResult.hasOwnProperty('equal') && !this._testResult.equal;
    }

    getImagesInfo(status) {
        const error = _.isEmpty(this.error) ? null : this.error;

        this.imagesInfo = status === IDLE
            ? [{status, expectedImg: this.getRefImg()}]
            : [].concat(_.extend({status, error}, getImagesFor(status, this)));

        return this.imagesInfo;
    }

    get error() {
        return _.pick(this._testResult, ['message', 'stack']);
    }

    get imageDir() {
        const components = [].concat(
            this._testResult.suite.path,
            this._testResult.state.name
        );

        return path.join.apply(null, components);
    }

    get state() {
        return this._testResult.state;
    }

    get attempt() {
        return this._testResult.attempt;
    }

    // for correct determine image paths in gui
    set attempt(attemptNum) {
        this._testResult.attempt = attemptNum;
    }

    getRefImg() {
        return _.get(this._testResult, 'refImg', {});
    }

    getCurrImg() {
        return _.get(this._testResult, 'currImg', {});
    }

    getErrImg() {
        return _.get(this._testResult, 'img', {});
    }

    prepareTestResult() {
        const {state: {name}, suite, browserId} = this._testResult;
        const suitePath = suite.path.concat(name);

        return {name, suitePath, browserId};
    }

    get multipleTabs() {
        return false;
    }
};
