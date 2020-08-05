'use strict';

const _ = require('lodash');
const {AsyncEmitter} = require('gemini-core').events;

function stubConfig(config = {}) {
    const browsers = config.browsers || {};
    const browserConfigs = {
        getBrowserIds: sinon.stub().named('getBrowserIds').returns(Object.keys(browsers)),
        forBrowser: sinon.stub().named('forBrowser').callsFake((bro) => _.defaults(browsers[bro], config))
    };

    return Object.assign(config, browserConfigs);
}

function stubTool(config = stubConfig(), events = {}, errors = {}, htmlReporter) {
    const tool = new AsyncEmitter();

    tool.config = config;
    tool.events = events;
    tool.errors = errors;

    tool.readTests = sinon.stub();
    tool.htmlReporter = htmlReporter || sinon.stub();
    tool.isWorker = () => {
        return false;
    };

    return tool;
}

function mkSuite(opts = {}) {
    return _.defaults(opts, {
        name: _.last(opts.suitePath) || 'default-suite',
        suitePath: ['default-suite'],
        status: 'idle',
        children: []
    });
}

function mkState(opts = {}) {
    return _.defaults(opts, {
        name: _.last(opts.suitePath) || 'default-state',
        suitePath: ['default-suite', 'default-state'],
        status: 'idle',
        browsers: []
    });
}

function mkBrowserResult(opts = {}) {
    return _.defaults(opts, {
        name: 'default-bro',
        result: mkTestResult({name: opts.name, browserVersion: opts.browserVersion}),
        retries: []
    });
}

function mkTestResult(result) {
    return _.defaults(result, {
        name: 'default-bro',
        suiteUrl: '',
        metaInfo: {browserVersion: result.browserVersion},
        imagesInfo: [],
        status: 'idle',
        attempt: 0
    });
}

function mkImg(result = {}) {
    return _.defaults(result, {
        path: 'default/path',
        size: {width: 100500, height: 500100}
    });
}

function mkImagesInfo(result) {
    return _.defaultsDeep(result, {
        expectedImg: mkImg(),
        actualImg: mkImg(),
        diffClusters: [{left: 0, top: 0, right: 10, bottom: 10}]
    });
}

function mkSuiteTree({suite = mkSuite(), state = mkState(), browsers = [mkBrowserResult()]} = {}) {
    suite.children.push(state);
    state.browsers = browsers;

    return suite;
}

function mkStorage() {
    const storage = {};

    return {
        setItem: function(key, value) {
            storage[key] = value || '';
        },
        getItem: function(key) {
            return key in storage ? storage[key] : null;
        },
        removeItem: function(key) {
            delete storage[key];
        },
        hasOwnProperty(prop) {
            return prop in storage;
        }
    };
}

function mkFormattedTest(result) {
    return _.defaultsDeep(result, {
        browserId: 'bro1',
        suite: {
            fullName: 'suite-full-name',
            path: ['suite'],
            getUrl: function() {
                return 'url';
            }
        },
        state: {
            name: 'name-default'
        },
        getImagesInfo: () => [],
        getCurrImg: () => {
            return {path: null};
        }
    });
}

module.exports = {
    stubConfig,
    stubTool,
    mkSuite,
    mkState,
    mkBrowserResult,
    mkTestResult,
    mkImagesInfo,
    mkSuiteTree,
    mkStorage,
    mkFormattedTest
};
