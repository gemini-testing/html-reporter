'use strict';

const crypto = require('crypto');
const _ = require('lodash');
const BaseToolRunner = require('../base-tool-runner');
const subscribeOnToolEvents = require('./report-subscriber');
const {formatTests} = require('../utils');

module.exports = class HermioneRunner extends BaseToolRunner {
    constructor(paths, tool, configs) {
        super(paths, tool, configs);

        this._tests = {};
    }

    run(tests = []) {
        const {grep, set: sets, browser: browsers} = this._globalOpts;
        const testPaths = _.isEmpty(tests) ? this._testFiles : collectTestPaths(tests);

        return this._tool.run(testPaths, {grep, sets, browsers});
    }

    _readTests() {
        const {browser} = this._globalOpts;
        const {autoRun} = this._guiOpts;

        return this._tool.readTests(this._testFiles, browser)
            .then((suites) => {
                _.forEach(suites, (suite, browser) => {
                    suite.eachTest((test) => {
                        const testId = formatId(test.id(), browser);
                        this._tests[testId] = _.extend(test, {browserId: browser});

                        test.pending
                            ? this._reportBuilder.addSkipped(test)
                            : this._reportBuilder.addIdle(test);
                    });
                });

                this._tree = Object.assign(this._reportBuilder.getResult(), {gui: true, autoRun});
                this._tree.suites = this._applyReuseData(this._tree.suites);
            });
    }

    _subscribeOnEvents() {
        subscribeOnToolEvents(this._tool, this._reportBuilder, this._eventSource, this._reportPath);
    }

    _prepareUpdateResult(test) {
        const {suite, state, browserId, attempt, actualPath} = test;

        // https://github.com/mochajs/mocha/blob/v2.4.5/lib/runnable.js#L165
        const fullTitle = `${suite.path.join(' ')} ${state.name}`;

        const testId = formatId(getShortMD5(fullTitle), browserId);
        const testResult = this._tests[testId];
        const {sessionId, url} = test.metaInfo;
        const imagePath = this._tool.config.browsers[browserId].getScreenshotPath(testResult, test.assertViewState);

        return _.merge({}, testResult, {imagePath, sessionId, attempt, actualPath, meta: {url}, updated: true});
    }
};

function collectTestPaths(tests) {
    const getTestPaths = (test) => formatTests(test, (browser) => _.get(browser, 'result.metaInfo.file'));

    return _([].concat(tests))
        .flatMap(getTestPaths)
        .compact()
        .value();
}

function formatId(hash, browserId) {
    return `${hash}/${browserId}`;
}

function getShortMD5(str) {
    return crypto.createHash('md5').update(str, 'ascii').digest('hex').substr(0, 7);
}
