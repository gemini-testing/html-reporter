'use strict';

const path = require('path');
const _ = require('lodash');
const proxyquire = require('proxyquire');
const ReportBuilder = require('lib/report-builder-factory/report-builder');
const {stubTool, stubConfig, mkSuite, mkState, mkBrowserResult, mkSuiteTree} = require('../../../utils');
const serverUtils = require('lib/server-utils');

describe('lib/gui/tool-runner-factory/base-tool-runner', () => {
    const sandbox = sinon.createSandbox();
    let reportBuilder;
    let ToolGuiReporter;
    let tool;

    const mkTool_ = () => stubTool(stubConfig());
    const mkToolCliOpts_ = (globalCliOpts = {name: () => 'tool'}, guiCliOpts = {}) => {
        return {program: globalCliOpts, options: guiCliOpts};
    };
    const mkPluginConfig_ = (config = {}) => {
        const pluginConfig = _.defaults(config, {path: 'default-path'});
        return {pluginConfig};
    };

    const mkGeminiSuiteCollection_ = () => {
        return {
            topLevelSuites: sandbox.stub().returns([]),
            allSuites: sandbox.stub().returns([]),
            clone: function() {
                return this;
            }
        };
    };

    const mkHermioneTestCollection_ = () => ({eachTest: sandbox.stub()});

    const initGuiReporter = (opts = {}) => {
        opts = _.defaults(opts, {
            paths: [],
            configs: {}
        });

        const configs = _.defaults(opts.configs, mkToolCliOpts_(), mkPluginConfig_());

        return ToolGuiReporter.create(opts.paths, tool, configs);
    };

    beforeEach(() => {
        sandbox.stub(serverUtils.logger, 'warn');
        sandbox.stub(serverUtils, 'require').returns({});

        reportBuilder = sinon.createStubInstance(ReportBuilder);
        sandbox.stub(ReportBuilder, 'create').returns(reportBuilder);
        reportBuilder.getResult.returns({});
    });

    afterEach(() => sandbox.restore());

    [
        {
            name: 'gemini',
            collection: mkGeminiSuiteCollection_()
        },
        {
            name: 'hermione',
            collection: mkHermioneTestCollection_()
        }
    ].forEach(({name, collection}) => {
        beforeEach(() => {
            tool = mkTool_();
            tool.readTests.resolves(collection);

            ToolGuiReporter = proxyquire(`lib/gui/tool-runner-factory/${name}`, {
                './report-subscriber': sandbox.stub()
            });
        });

        describe('create', () => {
            it('should set values added through api', () => {
                tool = {htmlReporter: {values: {foo: 'bar'}}};
                initGuiReporter();

                assert.calledWith(reportBuilder.setApiValues, {foo: 'bar'});
            });
        });

        describe(`initialize ${name}`, () => {
            it('should pass paths to "readTests" method', () => {
                const gui = initGuiReporter({paths: ['foo', 'bar']});

                return gui.initialize()
                    .then(() => assert.calledOnceWith(tool.readTests, ['foo', 'bar']));
            });

            it('should pass "grep", "sets" and "browsers" options to "readTests" method', () => {
                const grep = 'foo';
                const set = 'bar';
                const browser = 'yabro';
                const gui = initGuiReporter({
                    configs: {
                        program: {name: () => 'tool', grep, set, browser}
                    }
                });

                return gui.initialize()
                    .then(() => {
                        assert.calledOnceWith(tool.readTests, sinon.match.any, {grep, sets: set, browsers: browser});
                    });
            });
        });

        describe(`finalize ${name}`, () => {
            it('should save data file', () => {
                const gui = initGuiReporter();

                gui.finalize();

                assert.calledOnce(reportBuilder.saveDataFileSync);
            });
        });

        describe(`reuse ${name} data`, () => {
            it('should not try load data for reuse if suites are empty', () => {
                const gui = initGuiReporter({configs: mkPluginConfig_({path: 'report_path'})});

                return gui.initialize()
                    .then(() => assert.notCalled(serverUtils.require));
            });

            it('should try to load data for reuse', () => {
                const gui = initGuiReporter({configs: mkPluginConfig_({path: 'report_path'})});
                const reusePath = path.resolve(process.cwd(), 'report_path/data');

                const suites = [mkSuiteTree()];
                reportBuilder.getResult.returns({suites});

                return gui.initialize()
                    .then(() => assert.calledOnceWith(serverUtils.require, reusePath));
            });

            it('should not fail if data for reuse does not exist', () => {
                const gui = initGuiReporter();

                const suites = [mkSuiteTree()];
                reportBuilder.getResult.returns({suites});

                serverUtils.require.throws(new Error('Cannot find module'));

                return assert.isFulfilled(gui.initialize());
            });

            it('should log a warning that there is no data for reuse', () => {
                const gui = initGuiReporter();
                serverUtils.require.throws(new Error('Cannot find module'));

                const suites = [mkSuiteTree()];
                reportBuilder.getResult.returns({suites});

                return gui.initialize()
                    .then(() => assert.calledWithMatch(serverUtils.logger.warn, 'Nothing to reuse'));
            });

            describe('should not apply reuse data if', () => {
                it('it does not exist', () => {
                    const gui = initGuiReporter();
                    serverUtils.require.throws(new Error('Cannot find module'));

                    const suites = [mkSuiteTree()];
                    reportBuilder.getResult.returns({suites});

                    return gui.initialize()
                        .then(() => assert.deepEqual(gui.tree.suites, suites));
                });

                it('it is empty', () => {
                    const gui = initGuiReporter();

                    const suites = [mkSuiteTree()];
                    reportBuilder.getResult.returns({suites});

                    return gui.initialize()
                        .then(() => assert.deepEqual(gui.tree.suites, suites));
                });
            });

            it('should apply reuse data only for the matched browser', () => {
                const gui = initGuiReporter();

                const reuseYaBro = mkBrowserResult({
                    name: 'yabro',
                    result: {status: 'success'}
                });
                const reuseSuites = [mkSuiteTree({browsers: [reuseYaBro]})];
                serverUtils.require.returns({suites: reuseSuites});

                const chromeBro = mkBrowserResult({name: 'chrome'});
                const suites = [mkSuiteTree({
                    browsers: [mkBrowserResult({name: 'yabro'}), chromeBro]
                })];
                reportBuilder.getResult.returns({suites});

                return gui.initialize()
                    .then(() => {
                        const {browsers} = gui.tree.suites[0].children[0];

                        assert.deepEqual(browsers[0], reuseYaBro);
                        assert.deepEqual(browsers[1], chromeBro);
                    });
            });

            it('should apply reuse data for tree with nested suites', () => {
                const gui = initGuiReporter();

                const reuseYaBro = mkBrowserResult({
                    name: 'yabro',
                    result: {status: 'success'}
                });
                const reuseSuite = mkSuite({suitePath: ['suite1']});
                const reuseNestedSuite = mkSuiteTree({
                    suite: mkSuite({suitePath: ['suite1', 'suite2']}),
                    state: mkState({suitePath: ['suite1', 'suite2', 'state']}),
                    browsers: [reuseYaBro]
                });

                reuseSuite.children.push(reuseNestedSuite);
                serverUtils.require.returns({suites: [reuseSuite]});

                const suite = mkSuite({suitePath: ['suite1']});
                const nestedSuite = mkSuiteTree({
                    suite: mkSuite({suitePath: ['suite1', 'suite2']}),
                    state: mkState({suitePath: ['suite1', 'suite2', 'state']}),
                    browsers: [mkBrowserResult({name: 'yabro'})]
                });

                suite.children.push(nestedSuite);
                reportBuilder.getResult.returns({suites: [suite]});

                return gui.initialize()
                    .then(() => {
                        assert.deepEqual(
                            gui.tree.suites[0].children[0].children[0].browsers[0],
                            reuseYaBro
                        );
                    });
            });

            it('should change "status" for each level of the tree if data is reused', () => {
                const gui = initGuiReporter();

                const reuseSuites = [mkSuiteTree({
                    suite: mkSuite({status: 'fail'}),
                    state: mkState({status: 'success'}),
                    browsers: [mkBrowserResult({status: 'skipped'})]
                })];
                serverUtils.require.returns({suites: reuseSuites});

                const suites = [mkSuiteTree({
                    suite: mkSuite({status: 'idle'}),
                    state: mkState({status: 'idle'}),
                    browsers: [mkBrowserResult({status: 'idle'})]
                })];
                reportBuilder.getResult.returns({suites});

                return gui.initialize()
                    .then(() => {
                        const suite = gui.tree.suites[0];

                        assert.equal(suite.status, 'fail');
                        assert.equal(suite.children[0].status, 'success');
                        assert.equal(suite.children[0].browsers[0].status, 'skipped');
                    });
            });

            it('should not change "status" for any level of the tree if data is not reused', () => {
                const gui = initGuiReporter();

                const reuseSuites = [mkSuiteTree({
                    suite: mkSuite({status: 'fail'}),
                    state: mkState({status: 'success'}),
                    browsers: [mkBrowserResult({name: 'yabro', status: 'skipped'})]
                })];
                serverUtils.require.returns({suites: reuseSuites});

                const suites = [mkSuiteTree({
                    suite: mkSuite({status: 'idle'}),
                    state: mkState({status: 'idle'}),
                    browsers: [mkBrowserResult({name: 'chrome', status: 'idle'})]
                })];
                reportBuilder.getResult.returns({suites});

                return gui.initialize()
                    .then(() => {
                        const suite = gui.tree.suites[0];

                        assert.equal(suite.status, 'idle');
                        assert.equal(suite.children[0].status, 'idle');
                        assert.equal(suite.children[0].browsers[0].status, 'idle');
                    });
            });
        });
    });
});
