'use strict';

const Runner = require('./runner');

module.exports = class AllRunner extends Runner {
    run(runHandler) {
        this._collection.enableAll();

        return super.run(runHandler);
    }
};
