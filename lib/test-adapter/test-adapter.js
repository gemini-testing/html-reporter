'use strict';

module.exports = class TestAdapter {
    static create(testResult = {}, config = {}) {
        return new this(testResult, config);
    }

    constructor(testResult) {
        this._testResult = testResult;
    }

    isEqual() {
        return this._testResult.hasOwnProperty('equal');
    }

    get suite() {
        return this._suite;
    }

    get sessionId() {
        return this._testResult.sessionId || 'unknown session id';
    }

    get browserId() {
        return this._testResult.browserId;
    }
};
