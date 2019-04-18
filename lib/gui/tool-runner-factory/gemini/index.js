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

        this._collectionStates = null;
    }

    run(tests = []) {
        const formattedTests = _.flatMap([].concat(tests), (test) => formatTests(test));

        return Runner.create(this._toolName, this._collection, formattedTests)
            .run((collection) => this._tool.test(collection, {reporters: ['vflat']}));
    }

    _handleRunnableCollection() {
        const {browser: browsers} = this._globalOpts;
        const suites = this._collection.topLevelSuites();

        if (browsers) {
            suites.forEach((suite) => {
                suite.browsers = _.intersection(suite.browsers, browsers);
            });
        }

        this._collectionStates = getAllStates(this._collection.clone().allSuites());

        this._collectionStates.forEach((state) => {
            if (state.state.shouldSkip(state.browserId)) {
                return this._reportBuilder.addSkipped(state);
            }

            const refPath = this._tool.getScreenshotPath(state.suite, state.state.name, state.browserId);
            state.refImg = {path: path.relative(process.cwd(), refPath), size: null};

            return this._reportBuilder.addIdle(state);
        });

        this._fillTestsTree();
    }

    _subscribeOnEvents() {
        subscribeOnToolEvents(this._tool, this._reportBuilder, this._eventSource, this._reportPath);
    }

    _prepareUpdateResult(test) {
        const {metaInfo: {sessionId, url: fullUrl}, attempt} = test;
        const searchBy = _.pick(test, ['suite', 'state', 'browserId']);
        const currentState = _.find(this._collectionStates, searchBy);
        const refPath = this._tool.getScreenshotPath(currentState.suite, test.state.name, test.browserId);
        const currImg = test.imagesInfo[0].actualImg;
        const refImg = {
            path: refPath,
            size: currImg.size
        };

        const imagesInfo = test.imagesInfo.map((imageInfo) => _.set(imageInfo, 'expectedImg', refImg));

        const testResult = {
            suite: _.pick(currentState.suite, ['file', 'name', 'path', 'url']),
            state: _.pick(currentState.state, 'name'),
            browserId: currentState.browserId
        };

        return _.merge(testResult, {refImg, currImg, sessionId, attempt, imagesInfo, suite: {fullUrl}, updated: true});
    }

    _emitUpdateReference(result) {
        this._tool.emit(
            this._tool.events.UPDATE_RESULT,
            result
        );
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
