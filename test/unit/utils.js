'use strict';

const _ = require('lodash');
const EventEmitter2 = require('eventemitter2');
const {HtmlReporter} = require('lib/plugin-api');

function stubConfig(config = {}) {
    const browsers = config.browsers || {};
    const browserConfigs = {
        getBrowserIds: sinon.stub().named('getBrowserIds').returns(Object.keys(browsers)),
        forBrowser: sinon.stub().named('forBrowser').callsFake((bro) => _.defaults(browsers[bro], config))
    };

    return Object.assign(config, browserConfigs);
}

function stubReporterConfig(opts = {}) {
    return _.defaults(opts, {path: 'default-path'});
}

const stubTestCollection = (testsTree = {}) => {
    return {
        eachTest: (cb) => {
            Object.keys(testsTree).forEach((browserId) => cb(testsTree[browserId], browserId));
        },
        mapTests: (cb) => {
            return Object.keys(testsTree).map((browserId) => cb(testsTree[browserId], browserId));
        }
    };
};

function stubTool(config = stubConfig(), events = {}, errors = {}, htmlReporter) {
    const tool = new EventEmitter2();

    tool.config = config;
    tool.events = events;
    tool.errors = errors;

    tool.run = sinon.stub().resolves(false);
    tool.readTests = sinon.stub().resolves(stubTestCollection());
    tool.halt = sinon.stub();
    tool.htmlReporter = htmlReporter || sinon.createStubInstance(HtmlReporter);
    _.defaultsDeep(tool.htmlReporter, {
        emitAsync: sinon.stub(),
        events: {REPORT_SAVED: 'reportSaved'}
    });
    tool.isWorker = () => {
        return false;
    };

    sinon.stub(tool.htmlReporter, 'imagesSaver').value({saveImg: sinon.stub()});
    sinon.stub(tool.htmlReporter, 'config').value({});

    return tool;
}

function stubToolAdapter({
    config = stubConfig(), reporterConfig = stubReporterConfig(), testCollection = {tests: []}, htmlReporter
} = {}) {
    const toolAdapter = {
        config,
        reporterConfig,
        htmlReporter: htmlReporter || sinon.createStubInstance(HtmlReporter),
        run: sinon.stub().resolves(false),
        runWithoutRetries: sinon.stub().resolves(false),
        readTests: sinon.stub().resolves(testCollection),
        updateReference: sinon.stub(),
        handleTestResults: sinon.stub(),
        guiApi: {
            initServer: sinon.stub(),
            serverReady: sinon.stub()
        }
    };

    sinon.stub(toolAdapter.htmlReporter, 'imagesSaver').value({saveImg: sinon.stub()});
    sinon.stub(toolAdapter.htmlReporter, 'config').value({});

    return toolAdapter;
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
        state: {
            name: 'name-default'
        }
    });
}

class NoRefImageError extends Error {
    name = 'NoRefImageError';
}

class ImageDiffError extends Error {
    name = 'ImageDiffError';
    constructor() {
        super();
        this.stateName = '';
        this.currImg = {
            path: ''
        };
        this.refImg = {
            path: ''
        };
    }
}

module.exports = {
    stubConfig,
    stubReporterConfig,
    stubTestCollection,
    stubTool,
    stubToolAdapter,
    mkSuite,
    mkState,
    mkBrowserResult,
    mkTestResult,
    mkImagesInfo,
    mkSuiteTree,
    mkStorage,
    mkFormattedTest,
    NoRefImageError,
    ImageDiffError
};
