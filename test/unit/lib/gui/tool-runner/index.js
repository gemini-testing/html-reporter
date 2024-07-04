'use strict';

const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const proxyquire = require('proxyquire');
const {GuiReportBuilder} = require('lib/report-builder/gui');
const {LOCAL_DATABASE_NAME} = require('lib/constants/database');
const {logger} = require('lib/common-utils');
const {stubToolAdapter, stubConfig, stubReporterConfig, mkImagesInfo, mkState, mkSuite} = require('test/unit/utils');
const {SqliteClient} = require('lib/sqlite-client');
const {PluginEvents, TestStatus, UPDATED} = require('lib/constants');
const {Cache} = require('lib/cache');
const {TestplaneTestAdapter} = require('lib/adapters/test/testplane');
const {TestplaneConfigAdapter} = require('lib/adapters/config/testplane');

describe('lib/gui/tool-runner/index', () => {
    const sandbox = sinon.createSandbox();
    let reportBuilder;
    let ToolGuiReporter;
    let toolAdapter;
    let getTestsTreeFromDatabase;
    let looksSame;
    let toolRunnerUtils;
    let getReferencePath;
    let reporterHelpers;

    const mkTestCollection_ = (testsTree = {}) => {
        return {
            eachTest: (cb) => {
                Object.keys(testsTree).forEach((test) => cb(testsTree[test], testsTree[test].browserId));
            }
        };
    };

    const stubTest_ = (opts = {}) => {
        return mkState(_.defaults(opts, {
            id: () => 'default-id',
            fullTitle: () => 'some-title',
            clone: () => stubTest_(opts)
        }));
    };

    const mkTestAdapter_ = (test = stubTest_()) => {
        return TestplaneTestAdapter.create(test);
    };

    const mkConfigAdapter_ = (config = stubConfig()) => {
        return TestplaneConfigAdapter.create(config);
    };

    const initGuiReporter = (opts = {}) => {
        opts = _.defaults(opts, {
            toolAdapter: stubToolAdapter(),
            paths: [],
            cli: {
                tool: {},
                options: {}
            }
        });

        return ToolGuiReporter.create(opts);
    };

    beforeEach(() => {
        toolAdapter = stubToolAdapter();

        toolRunnerUtils = {
            findTestResult: sandbox.stub(),
            formatId: sandbox.stub().returns('some-id')
        };

        reportBuilder = sandbox.createStubInstance(GuiReportBuilder);
        reportBuilder.addTestResult.callsFake(_.identity);
        reportBuilder.provideAttempt.callsFake(_.identity);

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
            './adapters/test-result/utils': {
                copyAndUpdate: sandbox.stub().callsFake(_.assign)
            }
        });
        reporterHelpers = _.clone(reporterHelpersOriginal);

        ToolGuiReporter = proxyquire(`lib/gui/tool-runner`, {
            'looks-same': looksSame,
            './utils': toolRunnerUtils,
            '../../sqlite-client': {SqliteClient: {create: () => sandbox.createStubInstance(SqliteClient)}},
            '../../db-utils/server': {getTestsTreeFromDatabase},
            '../../reporter-helpers': reporterHelpers
        }).ToolRunner;

        sandbox.stub(logger, 'warn');

        sandbox.stub(process, 'cwd').returns('/ref/cwd');
    });

    afterEach(() => sandbox.restore());

    describe('initialize', () => {
        it('should set values added through api', () => {
            const htmlReporter = {emit: sandbox.stub(), values: {foo: 'bar'}, config: {}, imagesSaver: {}};
            toolAdapter = stubToolAdapter({htmlReporter});

            const gui = initGuiReporter({toolAdapter});

            return gui.initialize()
                .then(() => assert.calledWith(reportBuilder.setApiValues, {foo: 'bar'}));
        });

        describe('correctly pass options to "readTests" method', () => {
            it('should pass "paths" option', () => {
                const gui = initGuiReporter({toolAdapter, paths: ['foo', 'bar']});

                return gui.initialize()
                    .then(() => assert.calledOnceWith(toolAdapter.readTests, ['foo', 'bar']));
            });

            it('should pass cli options', () => {
                const cliTool = {grep: 'foo', set: 'bar', browser: 'yabro'};

                const gui = initGuiReporter({
                    toolAdapter,
                    cli: {
                        tool: cliTool,
                        options: {}
                    }
                });

                return gui.initialize()
                    .then(() => {
                        assert.calledOnceWith(toolAdapter.readTests, sinon.match.any, cliTool);
                    });
            });
        });

        it('should not add disabled test to report', () => {
            toolAdapter.readTests.resolves(mkTestCollection_({bro: stubTest_({disabled: true})}));

            const gui = initGuiReporter({toolAdapter, paths: ['foo']});

            return gui.initialize()
                .then(() => {
                    assert.notCalled(reportBuilder.addTestResult);
                });
        });

        it('should not add silently skipped test to report', () => {
            const testAdapter = mkTestAdapter_(stubTest_({silentSkip: true}));
            toolAdapter.readTests.resolves(mkTestCollection_({bro: testAdapter}));

            const gui = initGuiReporter({toolAdapter, paths: ['foo']});

            return gui.initialize()
                .then(() => {
                    assert.notCalled(reportBuilder.addTestResult);
                });
        });

        it('should not add test from silently skipped suite to report', () => {
            const silentlySkippedSuite = mkSuite({silentSkip: true});
            const testAdapter = mkTestAdapter_(stubTest_({parent: silentlySkippedSuite}));
            toolAdapter.readTests.resolves(mkTestCollection_({bro: testAdapter}));

            const gui = initGuiReporter({toolAdapter, paths: ['foo']});

            return gui.initialize()
                .then(() => {
                    assert.notCalled(reportBuilder.addTestResult);
                });
        });

        it('should add skipped test to report', () => {
            const testAdapter = mkTestAdapter_(stubTest_({pending: true}));
            toolAdapter.readTests.resolves(mkTestCollection_({bro: testAdapter}));

            const gui = initGuiReporter({toolAdapter, paths: ['foo']});

            return gui.initialize()
                .then(() => assert.calledOnce(reportBuilder.addTestResult));
        });

        it('should add idle test to report', () => {
            const testAdapter = mkTestAdapter_(stubTest_());
            toolAdapter.readTests.resolves(mkTestCollection_({bro: testAdapter}));

            const gui = initGuiReporter({toolAdapter, paths: ['foo']});

            return gui.initialize()
                .then(() => assert.calledOnce(reportBuilder.addTestResult));
        });

        it('should handle test results before read tests', () => {
            const testAdapter = mkTestAdapter_(stubTest_());
            toolAdapter.readTests.resolves(mkTestCollection_({bro: testAdapter}));

            const gui = initGuiReporter({toolAdapter, paths: ['foo']});

            return gui.initialize()
                .then(() => assert.callOrder(toolAdapter.handleTestResults, toolAdapter.readTests));
        });

        it('should initialize report builder after read tests for the correct order of events', async () => {
            const testAdapter = mkTestAdapter_(stubTest_());
            toolAdapter.readTests.resolves(mkTestCollection_({bro: testAdapter}));
            const gui = initGuiReporter({toolAdapter, paths: ['foo']});

            await gui.initialize();

            assert.callOrder(toolAdapter.readTests, toolAdapter.htmlReporter.emit);
            assert.calledOnceWith(toolAdapter.htmlReporter.emit, PluginEvents.DATABASE_CREATED, sinon.match.any);
        });
    });

    describe('updateReferenceImage', () => {
        it('should update reference for one image', async () => {
            const testRefUpdateData = [{
                id: 'some-id',
                fullTitle: () => 'some-title',
                clone: () => this,
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
            const config = mkConfigAdapter_(stubConfig({
                browsers: {yabro: {getScreenshotPath}}
            }));

            const testAdapter = mkTestAdapter_({...testRefUpdateData[0], clone: () => testRefUpdateData[0]});
            const testCollection = mkTestCollection_({'some-title.yabro': testAdapter});
            const toolAdapter = stubToolAdapter({config, testCollection});

            const gui = initGuiReporter({toolAdapter});
            await gui.initialize();

            await gui.updateReferenceImage(testRefUpdateData);

            assert.calledOnceWith(toolAdapter.updateReference, {
                refImg: {path: '/ref/path1', relativePath: '../path1', size: {height: 100, width: 200}},
                state: 'plain1'
            });
        });

        it('should update reference for each image', async () => {
            const tests = [{
                id: 'some-id',
                fullTitle: () => 'some-title',
                clone: () => this,
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

            const config = mkConfigAdapter_(stubConfig({
                browsers: {yabro: {getScreenshotPath}}
            }));

            const testAdapter = mkTestAdapter_({...tests[0], clone: () => tests[0]});
            const testCollection = mkTestCollection_({'some-title.yabro': testAdapter});
            const toolAdapter = stubToolAdapter({config, testCollection});

            const gui = initGuiReporter({toolAdapter});
            await gui.initialize();

            await gui.updateReferenceImage(tests);

            assert.calledTwice(toolAdapter.updateReference);
            assert.calledWith(toolAdapter.updateReference.firstCall, {
                refImg: {path: '/ref/path1', relativePath: '../path1', size: {height: 100, width: 200}},
                state: 'plain1'
            });
            assert.calledWith(toolAdapter.updateReference.secondCall, {
                refImg: {path: '/ref/path2', relativePath: '../path2', size: {height: 200, width: 300}},
                state: 'plain2'
            });
        });

        it('should determine status based on the latest result', async () => {
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
            const config = mkConfigAdapter_(stubConfig({
                browsers: {yabro: {getScreenshotPath}}
            }));

            const testAdapter = mkTestAdapter_({...testRefUpdateData[0], clone: () => testRefUpdateData[0]});
            const testCollection = mkTestCollection_({'some-title.yabro': testAdapter});
            const toolAdapter = stubToolAdapter({config, testCollection});

            reportBuilder.getLatestAttempt.withArgs({fullName: 'some-title', browserId: 'yabro'}).returns(100500);
            reportBuilder.getUpdatedReferenceTestStatus.withArgs(sinon.match({attempt: 100500})).returns(TestStatus.UPDATED);

            const gui = initGuiReporter({toolAdapter});
            await gui.initialize();

            reportBuilder.addTestResult.reset();

            await gui.updateReferenceImage(testRefUpdateData);

            assert.calledOnceWith(reportBuilder.addTestResult, sinon.match.any, {status: TestStatus.UPDATED});
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
                clone: () => this,
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
            const config = mkConfigAdapter_(stubConfig({
                browsers: {yabro: {getScreenshotPath}}
            }));

            const testAdapter = mkTestAdapter_({...tests[0], clone: () => tests[0]});
            const testCollection = mkTestCollection_({'some-title.yabro': testAdapter});
            const toolAdapter = stubToolAdapter({config, testCollection});

            const gui = initGuiReporter({toolAdapter});
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
            toolAdapter = stubToolAdapter({
                config: stubConfig({tolerance: 100500, antialiasingTolerance: 500100}),
                reporterConfig: stubReporterConfig({path: 'report_path'})
            });
            toolAdapter.readTests.resolves(mkTestCollection_());

            compareOpts = {
                tolerance: 100500,
                antialiasingTolerance: 500100,
                stopOnFirstFail: true,
                shouldCluster: false
            };

            sandbox.stub(path, 'resolve');
        });

        it('should stop comparison on first diff in reference images', async () => {
            const gui = initGuiReporter({toolAdapter});
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
            const gui = initGuiReporter({toolAdapter});
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
            const gui = initGuiReporter({toolAdapter});
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
            const gui = initGuiReporter({toolAdapter});
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
        it('should run tool with passed opts', async () => {
            const cliTool = {grep: /some-grep/, set: 'some-set', browser: 'yabro', devtools: true};
            const collection = mkTestCollection_();
            toolAdapter.readTests.resolves(collection);

            const gui = initGuiReporter({toolAdapter, cli: {tool: cliTool, options: {}}});
            const tests = [];

            await gui.initialize();
            await gui.run(tests);

            assert.calledOnceWith(toolAdapter.run, collection, tests, cliTool);
        });
    });

    describe('finalize tool', () => {
        it('should call reportBuilder.finalize', async () => {
            const gui = initGuiReporter({toolAdapter});

            await gui.initialize();
            gui.finalize();

            assert.calledOnce(reportBuilder.finalize);
        });
    });

    describe('reuse tests tree from database', () => {
        let gui;
        let dbPath;
        let toolAdapter;

        beforeEach(() => {
            toolAdapter = stubToolAdapter({reporterConfig: stubReporterConfig({path: 'report_path'})});
            gui = initGuiReporter({toolAdapter});
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
                const gui = initGuiReporter({toolAdapter, cli: {options: guiOpts}});

                await gui.initialize();

                assert.isTrue(gui.tree.autoRun);
            });
        });
    });
});
