'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs-extra'));
const Runner = require('./runner');
const ReportBuilderFactory = require('../../../report-builder-factory');
const subscribeOnToolEvents = require('./report-subscriber');
const BaseToolRunner = require('../base-tool-runner');

module.exports = class GeminiReporter extends BaseToolRunner {
    static create(paths, tool, configs) {
        return new this(paths, tool, configs);
    }

    constructor(paths, tool, {program: globalOpts, pluginConfig}) {
        super(paths);

        this._globalOpts = globalOpts;
        this._pluginConfig = pluginConfig;
        this._gemini = tool;
        this._collection = null;
        this._collectionStates = null;
        this.tests = null;
        this.reportBuilder = ReportBuilderFactory.create('gemini', tool.config, pluginConfig);
        _.set(tool.config, 'system.tempDir', this.currentDir);
    }

    initialize() {
        return this._recreateTmpDirs()
            .then(() => this._readTests())
            .then(() => this._subscribeOnEvents());
    }

    run(tests = []) {
        const formattedTests = _.flatMap([].concat(tests), formatTests);

        return Runner.create(this._collection, formattedTests)
            .run((collection) => this._gemini.test(collection, {reporters: ['vflat']}));
    }

    updateReferenceImage(suites) {
        const formattedTests = _.flatMap([].concat(suites), formatTests);

        formattedTests.forEach((test) => {
            const updateResult = this._prepareUpdateResult(test);
            this._gemini.emit(this._gemini.events.UPDATE_RESULT, updateResult);
        });
    }

    get browserIds() {
        return this._gemini.browserIds;
    }

    _recreateTmpDirs() {
        return Promise
            .all([
                fs.removeAsync(this.currentDir),
                fs.removeAsync(this.diffDir)
            ])
            .then(() => Promise.all([
                fs.mkdirpAsync(this.currentDir),
                fs.mkdirpAsync(this.diffDir)
            ]));
    }

    _readTests() {
        const {grep, set, browser} = this._globalOpts;
        return this._gemini.readTests(this._testFiles, {grep, sets: set})
            .then((collection) => {
                this._collection = collection;
                const suites = this._collection.topLevelSuites();

                if (browser) {
                    suites.forEach((suite) => {
                        suite.browsers = _.intersection(suite.browsers, browser);
                    });
                }

                this._collectionStates = getAllStates(this._collection.clone().allSuites());

                this._collectionStates.forEach((state) => {
                    state.state.shouldSkip(state.browserId)
                        ? this.reportBuilder.addSkipped(state)
                        : this.reportBuilder.addIdle(state);
                });
                this.tests = Object.assign(this.reportBuilder.getResult(), {gui: true});
            });
    }

    _subscribeOnEvents() {
        subscribeOnToolEvents(this._gemini, this.reportBuilder, this._eventSource, this._pluginConfig);
    }

    _prepareUpdateResult(test) {
        const searchBy = _.pick(test, ['suite', 'state', 'browserId']);
        const collectionResult = _.find(this._collectionStates, searchBy);
        const imagePath = this._gemini.getScreenshotPath(collectionResult.suite, test.state.name, test.browserId);
        const {sessionId, url: fullUrl} = test.metaInfo;

        return _.merge({}, collectionResult, {imagePath, sessionId, suite: {fullUrl}, updated: true});
    }
};

function getAllStates(suites) {
    return suites.reduce((acc, suite) => {
        suite.states.forEach((state) => {
            state.browsers.forEach((browserId) => {
                acc.push({
                    suite: state.suite,
                    state,
                    browserId
                });
            });
        });
        return acc;
    }, []);
}

function formatTests(test) {
    if (test.children) {
        return _.flatMap(test.children, formatTests);
    }

    if (test.browserId) {
        test.browsers = _.filter(test.browsers, {name: test.browserId});
    }

    return _.flatMap(test.browsers, (browser) => {
        return {
            suite: {path: test.suitePath.slice(0, -1)},
            state: {name: test.name},
            browserId: browser.name,
            metaInfo: browser.result.metaInfo
        };
    });
}
