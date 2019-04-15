'use strict';

module.exports = (runner) => {
    const workerFilepath = require.resolve('./hermione-worker');

    return runner.registerWorkers(workerFilepath, ['saveDiffTo']);
};
