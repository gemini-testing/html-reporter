'use strict';

const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');
const proxyquire = require('proxyquire');
const temp = require('temp');
const ReportBuilder = require('lib/report-builder-factory/report-builder');
const {stubTool, stubConfig} = require('test/utils');
const serverUtils = require('lib/server-utils');

describe('lib/gui/tool-runner-factory/gemini/index', () => {
    const sandbox = sinon.createSandbox();
    let GeminiGuiReporter;
    let reportBuilder;
    let gemini;

    const mkGemini_ = () => stubTool(stubConfig());
    const mkGeminiCliOpts_ = (cliOpts = {}) => ({program: cliOpts});
    const mkPluginConfig_ = (config = {}) => {
        const pluginConfig = _.defaults(config, {path: 'default-path'});
        return {pluginConfig};
    };

    const mkSuiteCollection_ = () => {
        return {
            topLevelSuites: sandbox.stub().returns([]),
            allSuites: sandbox.stub().returns([]),
            clone: function() {
                return this;
            }
        };
    };

    const initGeminiGuiReporter = (opts = {}) => {
        opts = _.defaults(opts, {
            gemini: mkGemini_(),
            paths: [],
            configs: {}
        });

        gemini = opts.gemini;
        gemini.readTests.resolves(mkSuiteCollection_());

        const configs = _.defaults(opts.configs, mkGeminiCliOpts_(), mkPluginConfig_());

        return GeminiGuiReporter.create(opts.paths, gemini, configs);
    };

    const mkSuite_ = (opts = {}) => {
        return _.defaults(opts, {
            name: _.last(opts.suitePath) || 'default-suite',
            suitePath: ['default-suite'],
            status: 'default',
            children: []
        });
    };

    const mkState_ = (opts = {}) => {
        return _.defaults(opts, {
            name: _.last(opts.suitePath) || 'default-state',
            suitePath: ['default-suite', 'default-state'],
            status: 'default',
            browsers: []
        });
    };

    const mkBrowserResult_ = (opts = {}) => {
        return _.defaults(opts, {
            name: 'default-bro',
            result: {
                name: opts.name || 'default-bro',
                status: 'default'
            }
        });
    };

    const mkSuiteTree_ = ({suite, state, browsers} = {}) => {
        suite = suite || mkSuite_();
        state = state || mkState_();
        browsers = browsers || mkBrowserResult_();

        suite.children.push(state);
        state.browsers = browsers;

        return suite;
    };

    beforeEach(() => {
        sandbox.stub(temp, 'path');
        sandbox.stub(serverUtils.logger, 'warn');
        sandbox.stub(serverUtils, 'require').returns({});

        sandbox.stub(fs, 'removeAsync').resolves();
        sandbox.stub(fs, 'mkdirpAsync').resolves();

        reportBuilder = sinon.createStubInstance(ReportBuilder);
        sandbox.stub(ReportBuilder, 'create').returns(reportBuilder);
        reportBuilder.getResult.returns({});

        GeminiGuiReporter = proxyquire('lib/gui/tool-runner-factory/gemini', {
            './report-subscriber': sandbox.stub()
        });
    });

    afterEach(() => sandbox.restore());

    describe('reuse data', () => {
        it('should try to load data for reuse', () => {
            const geminiGui = initGeminiGuiReporter({configs: mkPluginConfig_({path: 'report_path'})});
            const reusePath = path.resolve(process.cwd(), 'report_path/data');

            return geminiGui.initialize()
                .then(() => assert.calledOnceWith(serverUtils.require, reusePath));
        });

        it('should not fail if data for reuse does not exist', () => {
            const geminiGui = initGeminiGuiReporter();
            serverUtils.require.throws(new Error('Cannot find module'));

            return assert.isFulfilled(geminiGui.initialize());
        });

        it('should log a warning that there is no data for reuse', () => {
            const geminiGui = initGeminiGuiReporter();
            serverUtils.require.throws(new Error('Cannot find module'));

            return geminiGui.initialize()
                .then(() => assert.calledWithMatch(serverUtils.logger.warn, 'Nothing to reuse'));
        });

        describe('should not apply reuse data if', () => {
            it('it does not exist', () => {
                const geminiGui = initGeminiGuiReporter();
                serverUtils.require.throws(new Error('Cannot find module'));

                const suites = [mkSuiteTree_()];
                reportBuilder.getResult.returns({suites});

                return geminiGui.initialize()
                    .then(() => assert.deepEqual(geminiGui.tree.suites, suites));
            });

            it('it is empty', () => {
                const geminiGui = initGeminiGuiReporter();

                const suites = [mkSuiteTree_()];
                reportBuilder.getResult.returns({suites});

                return geminiGui.initialize()
                    .then(() => assert.deepEqual(geminiGui.tree.suites, suites));
            });
        });

        it('should apply reuse data only for the matched browser', () => {
            const geminiGui = initGeminiGuiReporter();

            const reuseYaBro = mkBrowserResult_({
                name: 'yabro',
                result: {status: 'success'}
            });
            const reuseSuites = [mkSuiteTree_({browsers: [reuseYaBro]})];
            serverUtils.require.returns({suites: reuseSuites});

            const chromeBro = mkBrowserResult_({name: 'chrome'});
            const suites = [mkSuiteTree_({
                browsers: [mkBrowserResult_({name: 'yabro'}), chromeBro]
            })];
            reportBuilder.getResult.returns({suites});

            return geminiGui.initialize()
                .then(() => {
                    const {browsers} = geminiGui.tree.suites[0].children[0];

                    assert.deepEqual(browsers[0], reuseYaBro);
                    assert.deepEqual(browsers[1], chromeBro);
                });
        });

        it('should apply reuse data for tree with nested suites', () => {
            const geminiGui = initGeminiGuiReporter();

            const reuseYaBro = mkBrowserResult_({
                name: 'yabro',
                result: {status: 'success'}
            });
            const reuseSuite = mkSuite_({suitePath: ['suite1']});
            const reuseNestedSuite = mkSuiteTree_({
                suite: mkSuite_({suitePath: ['suite1', 'suite2']}),
                state: mkState_({suitePath: ['suite1', 'suite2', 'state']}),
                browsers: [reuseYaBro]
            });

            reuseSuite.children.push(reuseNestedSuite);
            serverUtils.require.returns({suites: [reuseSuite]});

            const suite = mkSuite_({suitePath: ['suite1']});
            const nestedSuite = mkSuiteTree_({
                suite: mkSuite_({suitePath: ['suite1', 'suite2']}),
                state: mkState_({suitePath: ['suite1', 'suite2', 'state']}),
                browsers: [mkBrowserResult_({name: 'yabro'})]
            });

            suite.children.push(nestedSuite);
            reportBuilder.getResult.returns({suites: [suite]});

            return geminiGui.initialize()
                .then(() => {
                    assert.deepEqual(
                        geminiGui.tree.suites[0].children[0].children[0].browsers[0],
                        reuseYaBro
                    );
                });
        });

        it('should change "status" for each level of the tree if data is reused', () => {
            const geminiGui = initGeminiGuiReporter();

            const reuseSuites = [mkSuiteTree_({
                suite: mkSuite_({status: 'fail'}),
                state: mkState_({status: 'success'}),
                browsers: [mkBrowserResult_({status: 'skipped'})]
            })];
            serverUtils.require.returns({suites: reuseSuites});

            const suites = [mkSuiteTree_({
                suite: mkSuite_({status: 'idle'}),
                state: mkState_({status: 'idle'}),
                browsers: [mkBrowserResult_({status: 'idle'})]
            })];
            reportBuilder.getResult.returns({suites});

            return geminiGui.initialize()
                .then(() => {
                    const suite = geminiGui.tree.suites[0];

                    assert.equal(suite.status, 'fail');
                    assert.equal(suite.children[0].status, 'success');
                    assert.equal(suite.children[0].browsers[0].status, 'skipped');
                });
        });

        it('should not change "status" for any level of the tree if data is not reused', () => {
            const geminiGui = initGeminiGuiReporter();

            const reuseSuites = [mkSuiteTree_({
                suite: mkSuite_({status: 'fail'}),
                state: mkState_({status: 'success'}),
                browsers: [mkBrowserResult_({name: 'yabro', status: 'skipped'})]
            })];
            serverUtils.require.returns({suites: reuseSuites});

            const suites = [mkSuiteTree_({
                suite: mkSuite_({status: 'idle'}),
                state: mkState_({status: 'idle'}),
                browsers: [mkBrowserResult_({name: 'chrome', status: 'idle'})]
            })];
            reportBuilder.getResult.returns({suites});

            return geminiGui.initialize()
                .then(() => {
                    const suite = geminiGui.tree.suites[0];

                    assert.equal(suite.status, 'idle');
                    assert.equal(suite.children[0].status, 'idle');
                    assert.equal(suite.children[0].browsers[0].status, 'idle');
                });
        });
    });
});
