'use strict';

const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const proxyquire = require('proxyquire');
const GuiReportBuilder = require('lib/report-builder/gui');
const constantFileNames = require('lib/constants/file-names');
const serverUtils = require('lib/server-utils');
const {stubTool, stubConfig, mkTestResult, mkImagesInfo, mkState, mkSuite, mkSuiteTree, mkBrowserResult} = require('test/unit/utils');

describe('lib/gui/tool-runner/hermione/index', () => {
    const sandbox = sinon.createSandbox();
    let reportBuilder;
    let ToolGuiReporter;
    let reportSubscriber;
    let hermione;
    let getDataFromDatabase;

    const mkTestCollection_ = (testsTree = {}) => {
        return {
            eachTest: (cb) => {
                Object.keys(testsTree).forEach((test) => cb(testsTree[test]));
            }
        };
    };

    const stubTest_ = (opts) => {
        return mkState(_.defaults(opts, {id: () => 'default-id'}));
    };

    const mkToolCliOpts_ = (globalCliOpts = {name: () => 'hermione'}, guiCliOpts = {}) => {
        return {program: globalCliOpts, options: guiCliOpts};
    };
    const mkPluginConfig_ = (config = {}) => {
        const pluginConfig = _.defaults(config, {path: 'default-path'});
        return {pluginConfig};
    };

    const initGuiReporter = (hermione, opts = {}) => {
        opts = _.defaults(opts, {
            paths: [],
            configs: {}
        });

        const configs = _.defaults(opts.configs, mkToolCliOpts_(), mkPluginConfig_());

        return ToolGuiReporter.create(opts.paths, hermione, configs);
    };

    beforeEach(() => {
        hermione = stubTool();
        hermione.readTests.resolves(mkTestCollection_());

        reportBuilder = sinon.createStubInstance(GuiReportBuilder);
        reportSubscriber = sandbox.stub().named('reportSubscriber');

        sandbox.stub(GuiReportBuilder, 'create').returns(reportBuilder);
        reportBuilder.format.returns({prepareTestResult: sandbox.stub()});
        reportBuilder.getResult.returns({});

        getDataFromDatabase = sandbox.stub().returns({});

        ToolGuiReporter = proxyquire(`lib/gui/tool-runner`, {
            './report-subscriber': reportSubscriber,
            './utils': {findTestResult: sandbox.stub(), getDataFromDatabase},
            '../../reporter-helpers': {updateReferenceImage: sandbox.stub().resolves()}
        });
    });

    afterEach(() => sandbox.restore());

    describe('initialize', () => {
        it('should set values added through api', () => {
            const htmlReporter = {values: {foo: 'bar'}};
            hermione = stubTool(stubConfig(), {}, {}, htmlReporter);
            hermione.readTests.resolves(mkTestCollection_());

            const gui = initGuiReporter(hermione);

            return gui.initialize()
                .then(() => assert.calledWith(reportBuilder.setApiValues, {foo: 'bar'}));
        });

        it('should pass paths to "readTests" method', () => {
            const gui = initGuiReporter(hermione, {paths: ['foo', 'bar']});

            return gui.initialize()
                .then(() => assert.calledOnceWith(hermione.readTests, ['foo', 'bar']));
        });

        it('should pass "grep", "sets" and "browsers" options to "readTests" method', () => {
            const grep = 'foo';
            const set = 'bar';
            const browser = 'yabro';

            const gui = initGuiReporter(hermione, {
                configs: {
                    program: {name: () => 'tool', grep, set, browser}
                }
            });

            return gui.initialize()
                .then(() => {
                    assert.calledOnceWith(hermione.readTests, sinon.match.any, {grep, sets: set, browsers: browser});
                });
        });

        it('should not add disabled test to report', () => {
            const hermione = stubTool();
            hermione.readTests.resolves(mkTestCollection_({bro: stubTest_({disabled: true})}));

            const gui = initGuiReporter(hermione, {paths: ['foo']});

            return gui.initialize()
                .then(() => {
                    assert.notCalled(reportBuilder.addSkipped);
                    assert.notCalled(reportBuilder.addIdle);
                });
        });

        it('should not add silently skipped test to report', () => {
            const hermione = stubTool();
            hermione.readTests.resolves(mkTestCollection_({bro: stubTest_({silentSkip: true})}));

            const gui = initGuiReporter(hermione, {paths: ['foo']});

            return gui.initialize()
                .then(() => {
                    assert.notCalled(reportBuilder.addSkipped);
                    assert.notCalled(reportBuilder.addIdle);
                });
        });

        it('should not add test from silently skipped suite to report', () => {
            const hermione = stubTool();
            const silentlySkippedSuite = mkSuite({silentSkip: true});

            hermione.readTests.resolves(mkTestCollection_({bro: stubTest_({parent: silentlySkippedSuite})}));

            const gui = initGuiReporter(hermione, {paths: ['foo']});

            return gui.initialize()
                .then(() => {
                    assert.notCalled(reportBuilder.addSkipped);
                    assert.notCalled(reportBuilder.addIdle);
                });
        });

        it('should add skipped test to report', () => {
            const hermione = stubTool();
            hermione.readTests.resolves(mkTestCollection_({bro: stubTest_({pending: true})}));

            const gui = initGuiReporter(hermione, {paths: ['foo']});

            return gui.initialize()
                .then(() => assert.calledOnce(reportBuilder.addSkipped));
        });

        it('should add idle test to report', () => {
            const hermione = stubTool();
            hermione.readTests.resolves(mkTestCollection_({bro: stubTest_()}));

            const gui = initGuiReporter(hermione, {paths: ['foo']});

            return gui.initialize()
                .then(() => assert.calledOnce(reportBuilder.addIdle));
        });

        it('should subscribe on events before tests have ran', () => {
            const hermione = stubTool();
            hermione.readTests.resolves(mkTestCollection_({bro: stubTest_()}));

            const gui = initGuiReporter(hermione, {paths: ['foo']});

            return gui.initialize()
                .then(() => assert.callOrder(reportSubscriber, hermione.readTests));
        });
    });

    describe('updateReferenceImage', () => {
        const mkHermione_ = (config) => {
            const hermione = stubTool(config, {UPDATE_REFERENCE: 'updateReference'});
            sandbox.stub(hermione, 'emit');
            hermione.readTests.resolves(mkTestCollection_());

            return hermione;
        };

        describe('should emit "UPDATE_REFERENCE" event', () => {
            it('should emit "UPDATE_REFERENCE" event with state and reference data', async () => {
                const getScreenshotPath = sandbox.stub().returns('/ref/path1');
                const config = stubConfig({
                    browsers: {yabro: {getScreenshotPath}}
                });

                const hermione = mkHermione_(config);
                const gui = initGuiReporter(hermione);
                await gui.initialize();

                const tests = [mkTestResult({
                    browserId: 'yabro',
                    suite: {path: ['suite1']},
                    state: {},
                    imagesInfo: [mkImagesInfo({
                        stateName: 'plain1',
                        actualImg: {
                            size: {height: 100, width: 200}
                        }
                    })]
                })];

                await gui.updateReferenceImage(tests);

                assert.calledOnceWith(hermione.emit, 'updateReference', {
                    refImg: {path: '/ref/path1', size: {height: 100, width: 200}},
                    state: 'plain1'
                });
            });

            it('for each image info', async () => {
                const getScreenshotPath = sandbox.stub()
                    .onFirstCall().returns('/ref/path1')
                    .onSecondCall().returns('/ref/path2');

                const config = stubConfig({
                    browsers: {yabro: {getScreenshotPath}}
                });

                const hermione = mkHermione_(config);
                const gui = initGuiReporter(hermione);
                await gui.initialize();

                const tests = [mkTestResult({
                    browserId: 'yabro',
                    suite: {path: ['suite1']},
                    state: {},
                    imagesInfo: [
                        mkImagesInfo({
                            stateName: 'plain1',
                            actualImg: {
                                size: {height: 100, width: 200}
                            }
                        }),
                        mkImagesInfo({
                            stateName: 'plain2',
                            actualImg: {
                                size: {height: 200, width: 300}
                            }
                        })
                    ]
                })];

                await gui.updateReferenceImage(tests);

                assert.calledTwice(hermione.emit);
                assert.calledWith(hermione.emit.firstCall, 'updateReference', {
                    refImg: {path: '/ref/path1', size: {height: 100, width: 200}},
                    state: 'plain1'
                });
                assert.calledWith(hermione.emit.secondCall, 'updateReference', {
                    refImg: {path: '/ref/path2', size: {height: 200, width: 300}},
                    state: 'plain2'
                });
            });
        });
    });

    describe('finalize hermione', () => {
        it('should call reportBuilder.finalize', async () => {
            const gui = initGuiReporter(hermione);

            await gui.initialize();
            gui.finalize();

            assert.calledOnce(reportBuilder.finalize);
        });
    });

    describe('reuse hermione data', () => {
        let gui;
        let dbPath;

        beforeEach(() => {
            sandbox.stub(serverUtils.logger, 'warn');

            gui = initGuiReporter(hermione, {configs: mkPluginConfig_({path: 'report_path'})});
            dbPath = path.resolve('report_path', constantFileNames.LOCAL_DATABASE_NAME);

            sandbox.stub(fs, 'pathExists').withArgs(dbPath).resolves(false);
        });

        it('should log a warning that there is no data for reuse', () => {
            const suites = [mkSuiteTree()];
            reportBuilder.getResult.returns({suites});

            return gui.initialize()
                .then(() => assert.calledWithMatch(serverUtils.logger.warn, 'Nothing to reuse'));
        });

        it('should not apply reuse data if it is empty', () => {
            fs.pathExists.withArgs(dbPath).resolves(true);
            getDataFromDatabase.returns({});

            const suites = [mkSuiteTree()];
            reportBuilder.getResult.returns({suites});

            return gui.initialize()
                .then(() => assert.deepEqual(gui.tree.suites, suites));
        });

        it('should apply reuse data only for the matched browser', () => {
            fs.pathExists.withArgs(dbPath).resolves(true);

            const reuseYaBro = mkBrowserResult({
                name: 'yabro',
                result: {status: 'success'}
            });
            const reuseSuites = [mkSuiteTree({browsers: [reuseYaBro]})];
            getDataFromDatabase.returns({suites: reuseSuites});

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
            fs.pathExists.withArgs(dbPath).resolves(true);

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
            getDataFromDatabase.returns({suites: [reuseSuite]});

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

        it('should apply reuse data for tree with nested suites with children and browsers', () => {
            fs.pathExists.withArgs(dbPath).resolves(true);

            const reuseYaBro = mkBrowserResult({
                name: 'yabro',
                result: {status: 'success'}
            });
            const reuseChrome = mkBrowserResult({
                name: 'chrome',
                result: {status: 'success'}
            });

            const reuseSuite = mkSuite({suitePath: ['suite1']});
            const reuseNestedSuite = mkSuite({
                suitePath: ['suite1', 'suite2'],
                children: [
                    mkState({
                        suitePath: ['suite1', 'suite2', 'state'],
                        browsers: [reuseChrome]
                    })
                ],
                browsers: [reuseYaBro]
            });

            reuseSuite.children.push(reuseNestedSuite);
            getDataFromDatabase.returns({suites: [reuseSuite]});

            const suite = mkSuite({suitePath: ['suite1']});

            const nestedSuite = mkSuite({
                suitePath: ['suite1', 'suite2'],
                children: [
                    mkState({
                        suitePath: ['suite1', 'suite2', 'state'],
                        browsers: [mkBrowserResult({name: 'chrome'})]
                    })
                ],
                browsers: [mkBrowserResult({name: 'yabro'})]
            });

            suite.children.push(nestedSuite);
            reportBuilder.getResult.returns({suites: [suite]});

            return gui.initialize()
                .then(() => {
                    assert.deepEqual(
                        gui.tree.suites[0].children[0].browsers[0],
                        reuseYaBro
                    );
                    assert.deepEqual(
                        gui.tree.suites[0].children[0].children[0].browsers[0],
                        reuseChrome
                    );
                });
        });

        it('should change "status" for each level of the tree if data is reused', () => {
            fs.pathExists.withArgs(dbPath).resolves(true);

            const reuseSuites = [mkSuiteTree({
                suite: mkSuite({status: 'fail'}),
                state: mkState({status: 'success'}),
                browsers: [mkBrowserResult({status: 'skipped'})]
            })];
            getDataFromDatabase.returns({suites: reuseSuites});

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
            fs.pathExists.withArgs(dbPath).resolves(true);

            const reuseSuites = [mkSuiteTree({
                suite: mkSuite({status: 'fail'}),
                state: mkState({status: 'success'}),
                browsers: [mkBrowserResult({name: 'yabro', status: 'skipped'})]
            })];
            getDataFromDatabase.returns({suites: reuseSuites});

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
