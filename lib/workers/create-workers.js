'use strict';

module.exports = (runner) => {
    const workerFilepath = require.resolve('./worker');

    return runner.registerWorkers(workerFilepath, ['saveDiffTo']);
};
