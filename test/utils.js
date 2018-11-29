'use strict';

const _ = require('lodash');
const QEmitter = require('qemitter');

function stubConfig(config = {}) {
    const browsers = config.browsers || {};
    const browserConfigs = {
        getBrowserIds: sinon.stub().named('getBrowserIds').returns(Object.keys(browsers)),
        forBrowser: sinon.stub().named('forBrowser').callsFake((bro) => _.defaults(browsers[bro], config))
    };

    return Object.assign(_.omit(config, 'browsers'), browserConfigs);
}

function stubTool(config = stubConfig(), events = {}, errors = {}) {
    const tool = new QEmitter();

    tool.config = config;
    tool.events = events;
    tool.errors = errors;

    tool.readTests = sinon.stub();
    tool.htmlReporter = sinon.stub();

    return tool;
}

function mkSuite(opts = {}) {
    return _.defaults(opts, {
        name: _.last(opts.suitePath) || 'default-suite',
        suitePath: ['default-suite'],
        status: 'default',
        children: []
    });
}

function mkState(opts = {}) {
    return _.defaults(opts, {
        name: _.last(opts.suitePath) || 'default-state',
        suitePath: ['default-suite', 'default-state'],
        status: 'default',
        browsers: []
    });
}

function mkBrowserResult(opts = {}) {
    return _.defaults(opts, {
        name: 'default-bro',
        result: mkTestResult({name: opts.name}),
        retries: []
    });
}

function mkTestResult(result) {
    return _.defaults(result, {
        name: 'default-bro',
        suiteUrl: '',
        metaInfo: {},
        imagesInfo: [],
        status: 'default',
        attempt: 0
    });
}

function mkSuiteTree({suite = mkSuite(), state = mkState(), browsers = [mkBrowserResult()]} = {}) {
    suite.children.push(state);
    state.browsers = browsers;

    return suite;
}

module.exports = {
    stubConfig,
    stubTool,
    mkSuite,
    mkState,
    mkBrowserResult,
    mkTestResult,
    mkSuiteTree
};
