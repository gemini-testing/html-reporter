'use strict';

module.exports = class TestAdapter {
    static create(testResult = {}, config = {}) {
        return new this(testResult, config);
    }

    constructor(testResult) {
        this._testResult = testResult;
    }

    get suite() {
        return this._suite;
    }

    get attempt() {
        return this._testResult.attempt;
    }

    get sessionId() {
        return this._testResult.sessionId || 'unknown session id';
    }

    get browserId() {
        return this._testResult.browserId;
    }

    get imagePath() {
        return this._testResult.imagePath;
    }
};
