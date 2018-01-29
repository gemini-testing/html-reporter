'use strict';

module.exports = class Runner {
    constructor(collection) {
        this._collection = collection;
    }

    run(runHandler) {
        return runHandler(this._collection);
    }
};
