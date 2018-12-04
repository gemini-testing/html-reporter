import { ISuite } from 'typings/suite-adapter';

const path = require('path');
const _ = require('lodash');
const BaseToolRunner = require('../base-tool-runner');
const Runner = require('../runner');
const subscribeOnToolEvents = require('./report-subscriber');
const {formatTests} = require('../utils');

module.exports = class GeminiRunner extends BaseToolRunner {
    constructor(paths: string, tool: { [key: string]: any }, configs: { [key: string]: any }) {
        super(paths, tool, configs);

        this._collectionStates = null;
    }

    run(tests = []) {
        const formattedTests = _.flatMap([].concat(tests), (test: any[]) => formatTests(test));

        return Runner.create(this._toolName, this._collection, formattedTests)
            .run((collection: any) => this._tool.test(collection, {reporters: ['vflat']}));
    }

    _handleRunnableCollection() {
        const {browser: browsers} = this._globalOpts;
        const suites = this._collection.topLevelSuites();

        if (browsers) {
            suites.forEach((suite: ISuite) => {
                suite.browsers = _.intersection(suite.browsers, browsers);
            });
        }

        this._collectionStates = getAllStates(this._collection.clone().allSuites());

        this._collectionStates.forEach((state: any) => {
            if (state.state.shouldSkip(state.browserId)) {
                return this._reportBuilder.addSkipped(state);
            }

            const referencePath = this._tool.getScreenshotPath(state.suite, state.state.name, state.browserId);
            state.referencePath = path.relative(process.cwd(), referencePath);
            return this._reportBuilder.addIdle(state);
        });

        this._fillTestsTree();
    }

    _subscribeOnEvents() {
        subscribeOnToolEvents(this._tool, this._reportBuilder, this._eventSource, this._reportPath);
    }

    _prepareUpdateResult(test: any) {
        const searchBy = _.pick(test, ['suite', 'state', 'browserId']);
        const currentState = _.find(this._collectionStates, searchBy);
        const imagePath = this._tool.getScreenshotPath(currentState.suite, test.state.name, test.browserId);
        const {metaInfo: {sessionId, url: fullUrl}, attempt, actualPath} = test;
        const imagesInfo = test.imagesInfo.map((imageInfo: any[]) => _.set(imageInfo, 'imagePath', imagePath));

        const testResult = {
            suite: _.pick(currentState.suite, ['file', 'name', 'path', 'url']),
            state: _.pick(currentState.state, 'name'),
            browserId: currentState.browserId
        };

        return _.merge(testResult, {imagePath, sessionId, attempt, imagesInfo, actualPath, suite: {fullUrl}, updated: true});
    }
};

function getAllStates(suites: [any]) {
    return suites.reduce((acc, suite) => {
        suite.states.forEach((state: any) => {
            state.browsers.forEach((browserId: string) => {
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
