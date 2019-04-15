'use strict';

const os = require('os');

const workerFarm = require('@gemini-testing/worker-farm');
const Promise = require('bluebird');

const exportedMethods = ['saveDiffTo'];

class Workers {
    constructor() {
        const workerFilepath = require.resolve('./hermione-worker');

        const params = {
            maxConcurrentWorkers: os.cpus().length,
            autoStart: false,
            maxRetries: 0
        };

        this._workers = workerFarm(params, workerFilepath, exportedMethods);
    }

    exec(methodName, ...args) {
        if (!exportedMethods.includes(methodName)) {
            throw new Error(`Worker not export method '${methodName}'`);
        }
        return Promise.promisify(this._workers[methodName])(...args);
    }
}

module.exports = new Workers();
