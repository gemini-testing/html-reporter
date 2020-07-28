'use strict';

const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const proxyquire = require('proxyquire');
const GuiReportBuilder = require('lib/report-builder/gui');
const constantFileNames = require('lib/constants/file-names');
const serverUtils = require('lib/server-utils');
const {stubTool, stubConfig, mkTestResult, mkImagesInfo, mkState, mkSuite, mkSuiteTree} = require('test/unit/utils');

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

        sandbox.stub(serverUtils.logger, 'warn');
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

    describe('reuse tests tree from database', () => {
        let gui;
        let dbPath;

        beforeEach(() => {
            gui = initGuiReporter(hermione, {configs: mkPluginConfig_({path: 'report_path'})});
            dbPath = path.resolve('report_path', constantFileNames.LOCAL_DATABASE_NAME);

            sandbox.stub(fs, 'pathExists').withArgs(dbPath).resolves(false);
        });

        it('should log a warning that there is no data for reuse', async () => {
            const suites = [mkSuiteTree()];
            reportBuilder.getResult.returns({suites});

            await gui.initialize();

            assert.calledWithMatch(serverUtils.logger.warn, 'Nothing to reuse');
        });

        it('should not reuse tree if it is empty', async () => {
            fs.pathExists.withArgs(dbPath).resolves(true);
            getDataFromDatabase.returns({});

            await gui.initialize();

            assert.notCalled(reportBuilder.reuseTestsTree);
        });

        it('should reuse tests tree', async () => {
            fs.pathExists.withArgs(dbPath).resolves(true);
            getDataFromDatabase.returns('tests-tree');

            await gui.initialize();

            assert.calledOnceWith(reportBuilder.reuseTestsTree, 'tests-tree');
        });

        describe('should initialize gui tree with', () => {
            it('results from report builder', async () => {
                reportBuilder.getResult.returns({foo: 'bar', baz: 'qux'});

                await gui.initialize();

                assert.equal(gui.tree.foo, 'bar');
                assert.equal(gui.tree.baz, 'qux');
            });

            it('"gui" flag', async () => {
                await gui.initialize();

                assert.isTrue(gui.tree.gui);
            });

            it('"autoRun" from gui options', async () => {
                const guiOpts = {autoRun: true};
                const configs = {...mkPluginConfig_(), ...mkToolCliOpts_({}, guiOpts)};
                const gui = ToolGuiReporter.create([], hermione, configs);

                await gui.initialize();

                assert.isTrue(gui.tree.autoRun);
            });
        });
    });
});
