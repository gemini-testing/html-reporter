'use strict';

const path = require('path');
const TestAdapter = require('./test-adapter');
const GeminiSuiteAdapter = require('../suite-adapter/gemini-suite-adapter');

module.exports = class GeminiTestResultAdapter extends TestAdapter {
    constructor(testResult, config) {
        super(testResult);

        this._suite = GeminiSuiteAdapter.create(this._testResult.suite, config);
    }

    saveDiffTo(...args) {
        return this._testResult.saveDiffTo(...args);
    }

    get equal() {
        return this._testResult.equal;
    }

    get error() {
        return this._testResult.stack || this._testResult.message || this._testResult;
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

    get referencePath() {
        return this._testResult.referencePath;
    }

    get currentPath() {
        return this._testResult.currentPath;
    }

    get imagePath() {
        return this._testResult.imagePath;
    }
};
