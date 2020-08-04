'use strict';

const _ = require('lodash');
const ToolRunner = require('./tool-runner');

module.exports = class App {
    static create(paths, hermione, configs) {
        return new this(paths, hermione, configs);
    }

    constructor(paths, hermione, configs) {
        const {pluginConfig} = configs;

        this._toolRunner = ToolRunner.create(paths, hermione, configs);
        this._pluginConfig = pluginConfig;

        this._browserConfigs = [];
        this._retryCache = {};
    }

    async initialize() {
        return await this._toolRunner.initialize();
    }

    finalize() {
        this._toolRunner.finalize();
    }

    run(tests) {
        return _.isEmpty(tests)
            ? this._toolRunner.run()
            : this._runWithoutRetries(tests);
    }

    _runWithoutRetries(tests) {
        if (_.isEmpty(this._browserConfigs)) {
            this._browserConfigs = _.map(this._toolRunner.config.getBrowserIds(), (id) => this._toolRunner.config.forBrowser(id));
        }

        this._disableRetries();

        return this._toolRunner.run(tests)
            .finally(() => this._restoreRetries());
    }

    getTestsDataToUpdateRefs(imageIds = []) {
        return this._toolRunner.getTestsDataToUpdateRefs(imageIds);
    }

    getImageDataToFindEqualDiffs(imageIds = []) {
        return this._toolRunner.getImageDataToFindEqualDiffs(imageIds);
    }

    updateReferenceImage(failedTests = []) {
        return this._toolRunner.updateReferenceImage(failedTests);
    }

    async findEqualDiffs(data) {
        return this._toolRunner.findEqualDiffs(data);
    }

    addClient(connection) {
        this._toolRunner.addClient(connection);
    }

    get data() {
        return this._toolRunner.tree;
    }

    _disableRetries() {
        this._browserConfigs.forEach((broConfig) => {
            this._retryCache[broConfig.id] = broConfig.retry;
            broConfig.retry = 0;
        });
    }

    _restoreRetries() {
        this._browserConfigs.forEach((broConfig) => {
            broConfig.retry = this._retryCache[broConfig.id];
        });
    }
};
