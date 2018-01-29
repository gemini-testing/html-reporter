'use strict';

const Runner = require('./runner');

module.exports = class AllSuitesRunner extends Runner {
    run(runHandler) {
        this._collection.enableAll();

        return super.run(runHandler);
    }
};
