'use strict';

const _ = require('lodash');
const BaseToolRunner = require('../base-tool-runner');
const Runner = require('../runner');
const subscribeOnToolEvents = require('./report-subscriber');
const {formatTests} = require('../utils');
const {formatId, getShortMD5, mkFullTitle} = require('./utils');

module.exports = class HermioneRunner extends BaseToolRunner {
    constructor(paths, tool, configs) {
        super(paths, tool, configs);

        this._collection = null;
        this._tests = {};
    }

    run(tests = []) {
        const {grep, set: sets, browser: browsers} = this._globalOpts;
        const formattedTests = _.flatMap([].concat(tests), (test) => formatTests(test));

        return Runner.create(this._toolName, this._collection, formattedTests)
            .run((collection) => this._tool.run(collection, {grep, sets, browsers}));
    }

    _readTests() {
        const {browser: browsers} = this._globalOpts;
        const {autoRun} = this._guiOpts;

        return this._tool.readTests(this._testFiles, {browsers})
            .then((collection) => {
                this._collection = collection;

                this._collection.eachTest((test, browserId) => {
                    const testId = formatId(test.id(), browserId);
                    this._tests[testId] = _.extend(test, {browserId});

                    test.pending
                        ? this._reportBuilder.addSkipped(test)
                        : this._reportBuilder.addIdle(test);
                });

                this._tree = Object.assign(this._reportBuilder.getResult(), {gui: true, autoRun});
                this._tree.suites = this._applyReuseData(this._tree.suites);
            });
    }

    _subscribeOnEvents() {
        subscribeOnToolEvents(this._tool, this._reportBuilder, this._eventSource, this._reportPath);
    }

    _prepareUpdateResult(test) {
        const {browserId, attempt} = test;
        const fullTitle = mkFullTitle(test);
        const testId = formatId(getShortMD5(fullTitle), browserId);
        const testResult = this._tests[testId];
        const {sessionId, url} = test.metaInfo;
        const imagesInfo = test.imagesInfo.map((imageInfo) => {
            const {stateName} = imageInfo;
            const imagePath = this._tool.config.browsers[browserId].getScreenshotPath(testResult, stateName);

            return _.extend(imageInfo, {imagePath});
        });

        return _.merge({}, testResult, {imagesInfo, sessionId, attempt, meta: {url}, updated: true});
    }
};
