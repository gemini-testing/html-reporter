'use strict';

const os = require('os');

const workerFarm = require('@gemini-testing/worker-farm');
const Promise = require('bluebird');

const exportedMethods = ['saveDiffTo'];

module.exports = class HermioneWorkers {
    constructor() {
        const workerFilepath = require.resolve('./hermione-worker');

        const params = {
            maxConcurrentWorkers: os.cpus().length,
            autoStart: false,
            maxRetries: 0
        };

        this._workers = workerFarm(params, workerFilepath, exportedMethods);
        this._methods = exportedMethods.reduce((accumulator, methodName) => {
            accumulator[methodName] = Promise.promisify(this._workers[methodName]);
            return accumulator;
        }, {});
    }

    exec(methodName, ...args) {
        if (!exportedMethods.includes(methodName)) {
            throw new Error(`Worker does not contain requested method '${methodName}'`);
        }
        return this._methods[methodName](...args);
    }
};
