'use strict';

const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const proxyquire = require('proxyquire');
const GuiReportBuilder = require('lib/report-builder/gui');
const {LOCAL_DATABASE_NAME} = require('lib/constants/database');
const {logger} = require('lib/common-utils');
const Runner = require('lib/gui/tool-runner/runner');
const {stubTool, stubConfig, mkImagesInfo, mkState, mkSuite} = require('test/unit/utils');

describe('lib/gui/tool-runner/index', () => {
    const sandbox = sinon.createSandbox();
    let reportBuilder;
    let ToolGuiReporter;
    let reportSubscriber;
    let hermione;
    let getTestsTreeFromDatabase;
    let looksSame;
    let removeReferenceImage;
    let revertReferenceImage;

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

    const mkHermione_ = (config) => {
        const hermione = stubTool(config, {UPDATE_REFERENCE: 'updateReference'});
        sandbox.stub(hermione, 'emit');
        hermione.readTests.resolves(mkTestCollection_());

        return hermione;
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

        reportBuilder = sinon.createStubInstance(GuiReportBuilder);
        reportSubscriber = sandbox.stub().named('reportSubscriber').resolves();
        looksSame = sandbox.stub().named('looksSame').resolves({equal: true});
        removeReferenceImage = sandbox.stub().resolves();
        revertReferenceImage = sandbox.stub().resolves();

        sandbox.stub(GuiReportBuilder, 'create').returns(reportBuilder);
        reportBuilder.format.returns({prepareTestResult: sandbox.stub()});
        reportBuilder.getResult.returns({});

        getTestsTreeFromDatabase = sandbox.stub().returns({});

        ToolGuiReporter = proxyquire(`lib/gui/tool-runner`, {
            'looks-same': looksSame,
            './report-subscriber': reportSubscriber,
            './utils': {findTestResult: sandbox.stub()},
            '../../db-utils/server': {getTestsTreeFromDatabase},
            '../../reporter-helpers': {
                updateReferenceImage: sandbox.stub().resolves(),
                removeReferenceImage,
                revertReferenceImage
            }
        });

        sandbox.stub(reportBuilder, 'imageHandler').value({updateCacheExpectedPath: sinon.stub()});
        sandbox.stub(logger, 'warn');
    });

    afterEach(() => sandbox.restore());

    describe('initialize', () => {
        it('should set values added through api', () => {
            const htmlReporter = {values: {foo: 'bar'}};
            hermione = stubTool(stubConfig(), {}, {}, htmlReporter);

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

        it('should subscribe on events before read tests', () => {
            const hermione = stubTool();
            hermione.readTests.resolves(mkTestCollection_({bro: stubTest_()}));

            const gui = initGuiReporter(hermione, {paths: ['foo']});

            return gui.initialize()
                .then(() => assert.callOrder(reportSubscriber, hermione.readTests));
        });

        it('should initialize report builder after read tests for the correct order of events', async () => {
            const hermione = stubTool();
            hermione.readTests.resolves(mkTestCollection_({bro: stubTest_()}));
            const gui = initGuiReporter(hermione, {paths: ['foo']});

            await gui.initialize();

            assert.callOrder(hermione.readTests, reportBuilder.init);
        });
    });

    describe('updateReferenceImage', () => {
        describe('should emit "UPDATE_REFERENCE" event', () => {
            it('should emit "UPDATE_REFERENCE" event with state and reference data', async () => {
                const getScreenshotPath = sandbox.stub().returns('/ref/path1');
                const config = stubConfig({
                    browsers: {yabro: {getScreenshotPath}}
                });

                const hermione = mkHermione_(config);
                const gui = initGuiReporter(hermione);
                await gui.initialize();

                const tests = [{
                    browserId: 'yabro',
                    suite: {path: ['suite1']},
                    state: {},
                    metaInfo: {},
                    imagesInfo: [mkImagesInfo({
                        stateName: 'plain1',
                        actualImg: {
                            size: {height: 100, width: 200}
                        }
                    })]
                }];

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

                const tests = [{
                    browserId: 'yabro',
                    suite: {path: ['suite1']},
                    state: {},
                    metaInfo: {},
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
                }];

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

        it('should pass "origAttempt" to the ReportBuilder.addUpdate method to be able to calculate status properly', async () => {
            const getScreenshotPath = sandbox.stub().returns('/ref/path1');
            const config = stubConfig({
                browsers: {yabro: {getScreenshotPath}}
            });

            const hermione = mkHermione_(config);
            const gui = initGuiReporter(hermione);
            await gui.initialize();

            const tests = [{
                attempt: 10,
                suite: {path: ['suite1']},
                state: {},
                metaInfo: {},
                imagesInfo: []
            }];

            await gui.updateReferenceImage(tests);

            assert.calledOnceWith(reportBuilder.addUpdated, sinon.match({origAttempt: 10}));
        });
    });

    describe('undoAcceptImages', () => {
        const mkUndoTestData_ = async (stubResult, {stateName = 'plain'} = {}) => {
            const formattedResult = {
                updateCacheExpectedPath: sandbox.stub()
            };
            reportBuilder.format.withArgs(sinon.match.object).returns(formattedResult);
            reportBuilder.undoAcceptImage.withArgs(formattedResult, 'plain').resolves(stubResult);
            const getScreenshotPath = sandbox.stub().returns('/ref/path1');
            const config = stubConfig({
                browsers: {yabro: {getScreenshotPath}}
            });
            const hermione = mkHermione_(config);
            const gui = initGuiReporter(hermione);
            await gui.initialize();

            const tests = [{
                browserId: 'yabro',
                suite: {path: ['suite1']},
                state: {},
                metaInfo: {},
                imagesInfo: [
                    mkImagesInfo({
                        stateName,
                        actualImg: {
                            size: {height: 100, width: 200}
                        }
                    })
                ]
            }];

            return {formattedResult, gui, tests};
        };

        it('should remove reference, if ReportBuilder.undoAcceptImages resolved "shouldRemoveReference"', async () => {
            const stateName = 'plain';
            const {formattedResult, gui, tests} = await mkUndoTestData_({shouldRemoveReference: true}, {stateName});

            await gui.undoAcceptImages(tests);

            assert.calledOnceWith(removeReferenceImage, formattedResult, 'plain');
        });

        it('should revert reference, if ReportBuilder.undoAcceptImages resolved "shouldRevertReference"', async () => {
            const stateName = 'plain';
            const {formattedResult, gui, tests} = await mkUndoTestData_({shouldRevertReference: true}, {stateName});

            await gui.undoAcceptImages(tests);

            assert.calledOnceWith(revertReferenceImage, formattedResult, 'plain');
        });

        it('should update expected path', async () => {
            const stateName = 'plain';
            const previousExpectedPath = 'previousExpectedPath';
            const {gui, tests} = await mkUndoTestData_({previousExpectedPath}, {stateName});

            await gui.undoAcceptImages(tests);

            assert.calledOnceWith(reportBuilder.imageHandler.updateCacheExpectedPath, sinon.match.any, stateName, previousExpectedPath);
        });
    });

    describe('findEqualDiffs', () => {
        let compareOpts;

        beforeEach(() => {
            hermione = stubTool(stubConfig({tolerance: 100500, antialiasingTolerance: 500100}));
            hermione.readTests.resolves(mkTestCollection_());

            compareOpts = {
                tolerance: 100500,
                antialiasingTolerance: 500100,
                stopOnFirstFail: true,
                shouldCluster: false
            };

            sandbox.stub(path, 'resolve');
        });

        it('should stop comparison on first diff in reference images', async () => {
            const gui = initGuiReporter(hermione, {configs: mkPluginConfig_({path: 'report_path'})});
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
            const gui = initGuiReporter(hermione, {configs: mkPluginConfig_({path: 'report_path'})});
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
            const gui = initGuiReporter(hermione, {configs: mkPluginConfig_({path: 'report_path'})});
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
            const gui = initGuiReporter(hermione);
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
            sandbox.stub(Runner, 'create').withArgs(collection).returns(runner);
            hermione.readTests.resolves(collection);
        });

        it('should run hermione with passed opts', async () => {
            const globalCliOpts = {grep: /some-grep/, set: 'some-set', browser: 'yabro'};
            const configs = {...mkPluginConfig_(), ...mkToolCliOpts_(globalCliOpts)};
            const gui = ToolGuiReporter.create([], hermione, configs);

            await gui.initialize();
            await gui.run();

            const runHandler = runner.run.firstCall.args[0];
            runHandler(collection);

            assert.calledOnceWith(hermione.run, collection, {grep: /some-grep/, sets: 'some-set', browsers: 'yabro'});
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
                const gui = ToolGuiReporter.create([], hermione, configs);

                await gui.initialize();

                assert.isTrue(gui.tree.autoRun);
            });
        });
    });
});
