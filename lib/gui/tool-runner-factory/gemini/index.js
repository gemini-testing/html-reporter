'use strict';

const _ = require('lodash');
const BaseToolRunner = require('../base-tool-runner');
const Runner = require('./runner');
const subscribeOnToolEvents = require('./report-subscriber');
const {formatTests} = require('../utils');

module.exports = class GeminiRunner extends BaseToolRunner {
    constructor(paths, tool, configs) {
        super(paths, tool, configs);

        this._collection = null;
        this._collectionStates = null;
    }

    run(tests = []) {
        const formattedTests = _.flatMap([].concat(tests), (test) => formatTests(test, formatTestHandler));

        return Runner.create(this._collection, formattedTests)
            .run((collection) => this._tool.test(collection, {reporters: ['vflat']}));
    }

    updateReferenceImage(suites) {
        const updated = suites.map((s) => this._prepareUpdateResult(s));

        this._tool.emit(this._tool.events.UPDATE_RESULT, updated);
    }

    _readTests() {
        const {grep, set, browser} = this._globalOpts;
        const {autoRun} = this._guiOpts;

        return this._tool.readTests(this._testFiles, {grep, sets: set})
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
                        ? this._reportBuilder.addSkipped(state)
                        : this._reportBuilder.addIdle(state);
                });

                this._tree = Object.assign(this._reportBuilder.getResult(), {gui: true, autoRun});
                this._tree.suites = this._applyReuseData(this._tree.suites);
            });
    }

    _subscribeOnEvents() {
        subscribeOnToolEvents(this._tool, this._reportBuilder, this._eventSource, this._reportPath);
    }

    _prepareUpdateResult(test) {
        const searchBy = _.pick(test, ['suite', 'state', 'browserId']);
        const collectionResult = _.find(this._collectionStates, searchBy);
        const imagePath = this._tool.getScreenshotPath(collectionResult.suite, test.state.name, test.browserId);
        const {metaInfo: {sessionId, url: fullUrl}, attempt} = test;

        const pickedResult = {
            suite: _.pick(collectionResult.suite, ['name', 'path', 'url']),
            state: _.pick(collectionResult.state, 'name'),
            browserId: collectionResult.browserId
        };

        return _.merge(pickedResult, {imagePath, sessionId, attempt, suite: {fullUrl}, updated: true});
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

function formatTestHandler(browser, test) {
    const {suitePath, name, attempt} = test;
    const {result: {metaInfo}, name: browserId} = browser;

    return {
        suite: {path: suitePath.slice(0, -1)},
        state: {name},
        browserId,
        metaInfo,
        attempt
    };
}
