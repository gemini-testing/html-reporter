'use strict';

const path = require('path');
const _ = require('lodash');
const BaseToolRunner = require('../base-tool-runner');
const Runner = require('../runner');
const subscribeOnToolEvents = require('./report-subscriber');
const {formatTests} = require('../utils');

module.exports = class GeminiRunner extends BaseToolRunner {
    constructor(paths, tool, configs) {
        super(paths, tool, configs);

        this._collection = null;
        this._collectionStates = null;
    }

    run(tests = []) {
        const formattedTests = _.flatMap([].concat(tests), (test) => formatTests(test));

        return Runner.create(this._toolName, this._collection, formattedTests)
            .run((collection) => this._tool.test(collection, {reporters: ['vflat']}));
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
                    if (state.state.shouldSkip(state.browserId)) {
                        return this._reportBuilder.addSkipped(state);
                    }

                    const referencePath = this._tool.getScreenshotPath(state.suite, state.state.name, state.browserId);
                    state.referencePath = path.relative(process.cwd(), referencePath);
                    return this._reportBuilder.addIdle(state);
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
        const currentState = _.find(this._collectionStates, searchBy);
        const imagePath = this._tool.getScreenshotPath(currentState.suite, test.state.name, test.browserId);
        const {metaInfo: {sessionId, url: fullUrl}, attempt, actualPath} = test;
        const imagesInfo = test.imagesInfo.map((imageInfo) => _.set(imageInfo, 'imagePath', imagePath));

        const testResult = {
            suite: _.pick(currentState.suite, ['file', 'name', 'path', 'url']),
            state: _.pick(currentState.state, 'name'),
            browserId: currentState.browserId
        };

        return _.merge(testResult, {imagePath, sessionId, attempt, imagesInfo, actualPath, suite: {fullUrl}, updated: true});
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
