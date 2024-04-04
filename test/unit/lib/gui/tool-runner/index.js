'use strict';

const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const proxyquire = require('proxyquire');
const {GuiReportBuilder} = require('lib/report-builder/gui');
const {LOCAL_DATABASE_NAME} = require('lib/constants/database');
const {logger} = require('lib/common-utils');
const {stubTool, stubConfig, mkImagesInfo, mkState, mkSuite} = require('test/unit/utils');
const {SqliteClient} = require('lib/sqlite-client');
const {PluginEvents, TestStatus, UPDATED} = require('lib/constants');
const {Cache} = require('lib/cache');

describe('lib/gui/tool-runner/index', () => {
    const sandbox = sinon.createSandbox();
    let reportBuilder;
    let ToolGuiReporter;
    let subscribeOnToolEvents;
    let testplane;
    let getTestsTreeFromDatabase;
    let looksSame;
    let toolRunnerUtils;
    let createTestRunner;
    let getReferencePath;
    let reporterHelpers;

    const mkTestCollection_ = (testsTree = {}) => {
        return {
            eachTest: (cb) => {
                Object.keys(testsTree).forEach((test) => cb(testsTree[test], testsTree[test].browserId));
            }
        };
    };

    const stubTest_ = (opts) => {
        return mkState(_.defaults(opts, {
            id: () => 'default-id',
            fullTitle: () => 'some-title'
        }));
    };

    const mkToolCliOpts_ = (globalCliOpts = {name: () => 'testplane'}, guiCliOpts = {}) => {
        return {program: globalCliOpts, options: guiCliOpts};
    };
    const mkPluginConfig_ = (config = {}) => {
        const pluginConfig = _.defaults(config, {path: 'default-path'});
        return {pluginConfig};
    };

    const mkTestplane_ = (config, testsTree) => {
        const testplane = stubTool(config, {UPDATE_REFERENCE: 'updateReference'});
        sandbox.stub(testplane, 'emit');
        testplane.readTests.resolves(mkTestCollection_(testsTree));

        return testplane;
    };

    const initGuiReporter = (testplane, opts = {}) => {
        opts = _.defaults(opts, {
            paths: [],
            configs: {}
        });

        const configs = _.defaults(opts.configs, mkToolCliOpts_(), mkPluginConfig_());

        return ToolGuiReporter.create(opts.paths, testplane, configs);
    };

    beforeEach(() => {
        testplane = stubTool();

        createTestRunner = sandbox.stub();

        toolRunnerUtils = {
            findTestResult: sandbox.stub(),
            formatId: sandbox.stub().returns('some-id')
        };

        reportBuilder = sandbox.createStubInstance(GuiReportBuilder);
        reportBuilder.addTestResult.callsFake(_.identity);
        reportBuilder.provideAttempt.callsFake(_.identity);

        subscribeOnToolEvents = sandbox.stub().named('reportSubscriber').resolves();
        looksSame = sandbox.stub().named('looksSame').resolves({equal: true});

        sandbox.stub(GuiReportBuilder, 'create').returns(reportBuilder);
        reportBuilder.getResult.returns({});

        getTestsTreeFromDatabase = sandbox.stub().returns({});

        getReferencePath = sandbox.stub().returns('');

        const reporterHelpersOriginal = proxyquire('lib/reporter-helpers', {
            './server-utils': {
                copyFileAsync: sandbox.stub().resolves(),
                getCurrentAbsolutePath: sandbox.stub(),
                getReferencePath,
                fileExists: sandbox.stub(),
                deleteFile: sandbox.stub()
            },
            './test-adapter/utils': {
                copyAndUpdate: sandbox.stub().callsFake(_.assign)
            }
        });
        reporterHelpers = _.clone(reporterHelpersOriginal);

        ToolGuiReporter = proxyquire(`lib/gui/tool-runner`, {
            'looks-same': looksSame,
            './runner': {createTestRunner},
            './report-subscriber': {subscribeOnToolEvents},
            './utils': toolRunnerUtils,
            '../../sqlite-client': {SqliteClient: {create: () => sandbox.createStubInstance(SqliteClient)}},
            '../../db-utils/server': {getTestsTreeFromDatabase},
            '../../reporter-helpers': reporterHelpers
        }).ToolRunner;

        sandbox.stub(logger, 'warn');
    });

    afterEach(() => sandbox.restore());

    describe('initialize', () => {
        it('should set values added through api', () => {
            const htmlReporter = {emit: sandbox.stub(), values: {foo: 'bar'}, config: {}, imagesSaver: {}};
            testplane = stubTool(stubConfig(), {}, {}, htmlReporter);

            const gui = initGuiReporter(testplane);

            return gui.initialize()
                .then(() => assert.calledWith(reportBuilder.setApiValues, {foo: 'bar'}));
        });

        describe('correctly pass options to "readTests" method', () => {
            it('should pass "paths" option', () => {
                const gui = initGuiReporter(testplane, {paths: ['foo', 'bar']});

                return gui.initialize()
                    .then(() => assert.calledOnceWith(testplane.readTests, ['foo', 'bar']));
            });

            it('should pass "grep", "sets" and "browsers" options', () => {
                const grep = 'foo';
                const set = 'bar';
                const browser = 'yabro';

                const gui = initGuiReporter(testplane, {
                    configs: {
                        program: {grep, set, browser}
                    }
                });

                return gui.initialize()
                    .then(() => {
                        assert.calledOnceWith(testplane.readTests, sinon.match.any, sinon.match({grep, sets: set, browsers: browser}));
                    });
            });

            describe('"replMode" option', () => {
                it('should be disabled by default', async () => {
                    const gui = initGuiReporter(testplane, {
                        configs: {
                            program: {}
                        }
                    });

                    await gui.initialize();

                    assert.calledOnceWith(testplane.readTests, sinon.match.any, sinon.match({
                        replMode: {
                            enabled: false,
                            beforeTest: false,
                            onFail: false
                        }
                    }));
                });

                it('should be enabled when specify "repl" flag', async () => {
                    const gui = initGuiReporter(testplane, {
                        configs: {
                            program: {repl: true}
                        }
                    });

                    await gui.initialize();

                    assert.calledOnceWith(testplane.readTests, sinon.match.any, sinon.match({
                        replMode: {
                            enabled: true,
                            beforeTest: false,
                            onFail: false
                        }
                    }));
                });

                it('should be enabled when specify "beforeTest" flag', async () => {
                    const gui = initGuiReporter(testplane, {
                        configs: {
                            program: {replBeforeTest: true}
                        }
                    });

                    await gui.initialize();

                    assert.calledOnceWith(testplane.readTests, sinon.match.any, sinon.match({
                        replMode: {
                            enabled: true,
                            beforeTest: true,
                            onFail: false
                        }
                    }));
                });

                it('should be enabled when specify "onFail" flag', async () => {
                    const gui = initGuiReporter(testplane, {
                        configs: {
                            program: {replOnFail: true}
                        }
                    });

                    await gui.initialize();

                    assert.calledOnceWith(testplane.readTests, sinon.match.any, sinon.match({
                        replMode: {
                            enabled: true,
                            beforeTest: false,
                            onFail: true
                        }
                    }));
                });
            });
        });

        it('should not add disabled test to report', () => {
            const testplane = stubTool();
            testplane.readTests.resolves(mkTestCollection_({bro: stubTest_({disabled: true})}));

            const gui = initGuiReporter(testplane, {paths: ['foo']});

            return gui.initialize()
                .then(() => {
                    assert.notCalled(reportBuilder.addTestResult);
                });
        });

        it('should not add silently skipped test to report', () => {
            const testplane = stubTool();
            testplane.readTests.resolves(mkTestCollection_({bro: stubTest_({silentSkip: true})}));

            const gui = initGuiReporter(testplane, {paths: ['foo']});

            return gui.initialize()
                .then(() => {
                    assert.notCalled(reportBuilder.addTestResult);
                });
        });

        it('should not add test from silently skipped suite to report', () => {
            const testplane = stubTool();
            const silentlySkippedSuite = mkSuite({silentSkip: true});

            testplane.readTests.resolves(mkTestCollection_({bro: stubTest_({parent: silentlySkippedSuite})}));

            const gui = initGuiReporter(testplane, {paths: ['foo']});

            return gui.initialize()
                .then(() => {
                    assert.notCalled(reportBuilder.addTestResult);
                });
        });

        it('should add skipped test to report', () => {
            const testplane = stubTool();
            testplane.readTests.resolves(mkTestCollection_({bro: stubTest_({pending: true})}));

            const gui = initGuiReporter(testplane, {paths: ['foo']});

            return gui.initialize()
                .then(() => assert.calledOnce(reportBuilder.addTestResult));
        });

        it('should add idle test to report', () => {
            const testplane = stubTool();
            testplane.readTests.resolves(mkTestCollection_({bro: stubTest_()}));

            const gui = initGuiReporter(testplane, {paths: ['foo']});

            return gui.initialize()
                .then(() => assert.calledOnce(reportBuilder.addTestResult));
        });

        it('should subscribe on events before read tests', () => {
            const testplane = stubTool();
            testplane.readTests.resolves(mkTestCollection_({bro: stubTest_()}));

            const gui = initGuiReporter(testplane, {paths: ['foo']});

            return gui.initialize()
                .then(() => assert.callOrder(subscribeOnToolEvents, testplane.readTests));
        });

        it('should initialize report builder after read tests for the correct order of events', async () => {
            const testplane = stubTool();
            testplane.readTests.resolves(mkTestCollection_({bro: stubTest_()}));
            const gui = initGuiReporter(testplane, {paths: ['foo']});

            await gui.initialize();

            assert.callOrder(testplane.readTests, testplane.htmlReporter.emit);
            assert.calledOnceWith(testplane.htmlReporter.emit, PluginEvents.DATABASE_CREATED, sinon.match.any);
        });
    });

    describe('updateReferenceImage', () => {
        describe('should emit "UPDATE_REFERENCE" event', () => {
            it('should emit "UPDATE_REFERENCE" event with state and reference data', async () => {
                const testRefUpdateData = [{
                    id: 'some-id',
                    fullTitle: () => 'some-title',
                    browserId: 'yabro',
                    suite: {path: ['suite1']},
                    state: {},
                    metaInfo: {},
                    imagesInfo: [{
                        status: UPDATED,
                        stateName: 'plain1',
                        actualImg: {
                            size: {height: 100, width: 200}
                        }
                    }]
                }];

                const getScreenshotPath = sandbox.stub().returns('/ref/path1');
                const config = stubConfig({
                    browsers: {yabro: {getScreenshotPath}}
                });
                const testplane = mkTestplane_(config, {'some-title.yabro': testRefUpdateData[0]});
                const gui = initGuiReporter(testplane, {pluginConfig: {path: 'report-path'}});
                await gui.initialize();

                await gui.updateReferenceImage(testRefUpdateData);

                assert.calledOnceWith(testplane.emit, 'updateReference', {
                    refImg: {path: '/ref/path1', size: {height: 100, width: 200}},
                    state: 'plain1'
                });
            });

            it('for each image info', async () => {
                const tests = [{
                    id: 'some-id',
                    fullTitle: () => 'some-title',
                    browserId: 'yabro',
                    suite: {path: ['suite1']},
                    state: {},
                    metaInfo: {},
                    imagesInfo: [
                        {
                            status: UPDATED,
                            stateName: 'plain1',
                            actualImg: {
                                size: {height: 100, width: 200}
                            }
                        },
                        {
                            status: UPDATED,
                            stateName: 'plain2',
                            actualImg: {
                                size: {height: 200, width: 300}
                            }
                        }
                    ]
                }];

                const getScreenshotPath = sandbox.stub()
                    .onFirstCall().returns('/ref/path1')
                    .onSecondCall().returns('/ref/path2');

                const config = stubConfig({
                    browsers: {yabro: {getScreenshotPath}}
                });

                const testplane = mkTestplane_(config, {'some-title.yabro': tests[0]});
                const gui = initGuiReporter(testplane);
                await gui.initialize();

                await gui.updateReferenceImage(tests);

                assert.calledTwice(testplane.emit);
                assert.calledWith(testplane.emit.firstCall, 'updateReference', {
                    refImg: {path: '/ref/path1', size: {height: 100, width: 200}},
                    state: 'plain1'
                });
                assert.calledWith(testplane.emit.secondCall, 'updateReference', {
                    refImg: {path: '/ref/path2', size: {height: 200, width: 300}},
                    state: 'plain2'
                });
            });
        });
    });

    describe('undoAcceptImages', () => {
        const mkUndoTestData_ = async (stubResult, {stateName = 'plain'} = {}) => {
            reportBuilder.undoAcceptImage.withArgs(sinon.match({
                fullName: 'some-title'
            }), 'plain').returns({
                newResult: {fullName: 'some-title'},
                ...stubResult
            });
            const tests = [{
                id: 'some-id',
                fullTitle: () => 'some-title',
                browserId: 'yabro',
                suite: {path: ['suite1']},
                state: {},
                metaInfo: {},
                imagesInfo: [
                    {
                        status: TestStatus.UPDATED,
                        stateName,
                        actualImg: {
                            size: {height: 100, width: 200}
                        }
                    }
                ]
            }];

            const getScreenshotPath = sandbox.stub().returns('/ref/path1');
            const config = stubConfig({
                browsers: {yabro: {getScreenshotPath}}
            });
            const testplane = mkTestplane_(config, {'some-title.yabro': tests[0]});
            const gui = initGuiReporter(testplane);
            await gui.initialize();

            return {gui, tests};
        };

        it('should remove reference, if ReportBuilder.undoAcceptImages resolved "shouldRemoveReference"', async () => {
            sandbox.stub(reporterHelpers, 'removeReferenceImage');
            const stateName = 'plain';
            const {gui, tests} = await mkUndoTestData_({shouldRemoveReference: true}, {stateName});

            await gui.undoAcceptImages(tests);

            assert.calledOnceWith(reporterHelpers.removeReferenceImage, sinon.match({fullName: 'some-title'}), 'plain');
        });

        it('should revert reference, if ReportBuilder.undoAcceptImages resolved "shouldRevertReference"', async () => {
            sandbox.stub(reporterHelpers, 'revertReferenceImage');
            const stateName = 'plain';
            const {gui, tests} = await mkUndoTestData_({
                shouldRevertReference: true, removedResult: 'some-result'
            }, {stateName});

            await gui.undoAcceptImages(tests);

            assert.calledOnceWith(reporterHelpers.revertReferenceImage, 'some-result', sinon.match({fullName: 'some-title'}), 'plain');
        });

        it('should update expected path', async () => {
            sandbox.stub(Cache.prototype, 'set');
            const stateName = 'plain';
            const previousExpectedPath = 'previousExpectedPath';
            const {gui, tests} = await mkUndoTestData_({previousExpectedPath}, {stateName});

            await gui.undoAcceptImages(tests);

            assert.calledOnce(Cache.prototype.set);
            const args = Cache.prototype.set.firstCall.args;
            assert.deepEqual(args[0], [{browserId: 'yabro', testPath: ['some-title']}, stateName]);
            assert.deepEqual(args[1], previousExpectedPath);
        });
    });

    describe('findEqualDiffs', () => {
        let compareOpts;

        beforeEach(() => {
            testplane = stubTool(stubConfig({tolerance: 100500, antialiasingTolerance: 500100}));
            testplane.readTests.resolves(mkTestCollection_());

            compareOpts = {
                tolerance: 100500,
                antialiasingTolerance: 500100,
                stopOnFirstFail: true,
                shouldCluster: false
            };

            sandbox.stub(path, 'resolve');
        });

        it('should stop comparison on first diff in reference images', async () => {
            const gui = initGuiReporter(testplane, {configs: mkPluginConfig_({path: 'report_path'})});
            const refImagesInfo = mkImagesInfo({expectedImg: {path: 'ref-path-1'}});
            const comparedImagesInfo = [mkImagesInfo({expectedImg: {path: 'ref-path-2'}})];

            path.resolve
                .withArgs(process.cwd(), 'report_path', 'ref-path-1').returns('/ref-path-1')
                .withArgs(process.cwd(), 'report_path', 'ref-path-2').returns('/ref-path-2');

            looksSame.withArgs(
                {source: '/ref-path-1', boundingBox: refImagesInfo.diffClusters[0]},
                {source: '/ref-path-2', boundingBox: comparedImagesInfo[0].diffClusters[0]},
                compareOpts
            ).resolves({equal: false});

            await gui.initialize();
            const result = await gui.findEqualDiffs([refImagesInfo, ...comparedImagesInfo]);

            assert.calledOnce(looksSame);
            assert.isEmpty(result);
        });

        it('should stop comparison on diff in actual images', async () => {
            const gui = initGuiReporter(testplane, {configs: mkPluginConfig_({path: 'report_path'})});
            const refImagesInfo = mkImagesInfo({actualImg: {path: 'act-path-1'}});
            const comparedImagesInfo = [mkImagesInfo({actualImg: {path: 'act-path-2'}})];

            path.resolve
                .withArgs(process.cwd(), 'report_path', 'act-path-1').returns('/act-path-1')
                .withArgs(process.cwd(), 'report_path', 'act-path-2').returns('/act-path-2');

            looksSame.onFirstCall().resolves({equal: true});
            looksSame.withArgs(
                {source: '/act-path-1', boundingBox: refImagesInfo.diffClusters[0]},
                {source: '/act-path-2', boundingBox: comparedImagesInfo[0].diffClusters[0]},
                compareOpts
            ).resolves({equal: false});

            await gui.initialize();
            const result = await gui.findEqualDiffs([refImagesInfo, ...comparedImagesInfo]);

            assert.calledTwice(looksSame);
            assert.isEmpty(result);
        });

        it('should compare each diff cluster', async () => {
            const gui = initGuiReporter(testplane, {configs: mkPluginConfig_({path: 'report_path'})});
            const refImagesInfo = mkImagesInfo({
                diffClusters: [
                    {left: 0, top: 0, right: 5, bottom: 5},
                    {left: 10, top: 10, right: 15, bottom: 15}
                ]
            });
            const comparedImagesInfo = [mkImagesInfo({
                diffClusters: [
                    {left: 0, top: 0, right: 5, bottom: 5},
                    {left: 10, top: 10, right: 15, bottom: 15}
                ]
            })];

            looksSame.resolves({equal: true});

            await gui.initialize();
            await gui.findEqualDiffs([refImagesInfo, ...comparedImagesInfo]);

            assert.equal(looksSame.callCount, 4);
        });

        it('should return all found image ids with equal diffs', async () => {
            const gui = initGuiReporter(testplane);
            const refImagesInfo = {...mkImagesInfo(), id: 'selected-img-1'};
            const comparedImagesInfo = [
                {...mkImagesInfo(), id: 'compared-img-2'},
                {...mkImagesInfo(), id: 'compared-img-3'}
            ];

            looksSame.resolves({equal: true});

            await gui.initialize();
            const result = await gui.findEqualDiffs([refImagesInfo, ...comparedImagesInfo]);

            assert.deepEqual(result, ['compared-img-2', 'compared-img-3']);
        });
    });

    describe('run', () => {
        let runner;
        let collection;

        beforeEach(() => {
            runner = {run: sandbox.stub().resolves()};
            collection = mkTestCollection_();
            createTestRunner.withArgs(collection).returns(runner);
            testplane.readTests.resolves(collection);
        });

        describe('should run testplane with', () => {
            const run_ = async (globalCliOpts = {}) => {
                const configs = {...mkPluginConfig_(), ...mkToolCliOpts_(globalCliOpts)};
                const gui = ToolGuiReporter.create([], testplane, configs);

                await gui.initialize();
                await gui.run();

                const runHandler = runner.run.firstCall.args[0];
                runHandler(collection);
            };

            it('passed opts', async () => {
                await run_({grep: /some-grep/, set: 'some-set', browser: 'yabro', devtools: true});

                assert.calledOnceWith(testplane.run, collection, sinon.match({grep: /some-grep/, sets: 'some-set', browsers: 'yabro', devtools: true}));
            });

            describe('"replMode" option', () => {
                it('should be disabled by default', async () => {
                    await run_();

                    assert.calledOnceWith(testplane.run, collection, sinon.match({
                        replMode: {
                            enabled: false,
                            beforeTest: false,
                            onFail: false
                        }
                    }));
                });

                it('should be enabled when specify "repl" flag', async () => {
                    await run_({repl: true});

                    assert.calledOnceWith(testplane.run, collection, sinon.match({
                        replMode: {
                            enabled: true,
                            beforeTest: false,
                            onFail: false
                        }
                    }));
                });

                it('should be enabled when specify "beforeTest" flag', async () => {
                    await run_({replBeforeTest: true});

                    assert.calledOnceWith(testplane.run, collection, sinon.match({
                        replMode: {
                            enabled: true,
                            beforeTest: true,
                            onFail: false
                        }
                    }));
                });

                it('should be enabled when specify "onFail" flag', async () => {
                    await run_({replOnFail: true});

                    assert.calledOnceWith(testplane.run, collection, sinon.match({
                        replMode: {
                            enabled: true,
                            beforeTest: false,
                            onFail: true
                        }
                    }));
                });
            });
        });
    });

    describe('finalize testplane', () => {
        it('should call reportBuilder.finalize', async () => {
            const gui = initGuiReporter(testplane);

            await gui.initialize();
            gui.finalize();

            assert.calledOnce(reportBuilder.finalize);
        });
    });

    describe('reuse tests tree from database', () => {
        let gui;
        let dbPath;

        beforeEach(() => {
            gui = initGuiReporter(testplane, {configs: mkPluginConfig_({path: 'report_path'})});
            dbPath = path.resolve('report_path', LOCAL_DATABASE_NAME);

            sandbox.stub(fs, 'pathExists').withArgs(dbPath).resolves(false);
        });

        it('should log a warning that there is no data for reuse', async () => {
            reportBuilder.getResult.returns({});

            await gui.initialize();

            assert.calledWithMatch(logger.warn, 'Nothing to reuse');
        });

        it('should not reuse tree if it is empty', async () => {
            fs.pathExists.withArgs(dbPath).resolves(true);
            getTestsTreeFromDatabase.returns({});

            await gui.initialize();

            assert.notCalled(reportBuilder.reuseTestsTree);
        });

        it('should reuse tests tree', async () => {
            fs.pathExists.withArgs(dbPath).resolves(true);
            getTestsTreeFromDatabase.returns('tests-tree');

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

            it('"autoRun" from gui options', async () => {
                const guiOpts = {autoRun: true};
                const configs = {...mkPluginConfig_(), ...mkToolCliOpts_({}, guiOpts)};
                const gui = ToolGuiReporter.create([], testplane, configs);

                await gui.initialize();

                assert.isTrue(gui.tree.autoRun);
            });
        });
    });
});
