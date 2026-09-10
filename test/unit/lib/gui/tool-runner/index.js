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
const {PluginEvents, TestStatus, UPDATED, IDLE} = require('lib/constants');
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

        getTestsTreeFromDatabase = sandbox.stub().resolves({});

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
            toolAdapter.readTests.resolves({tests: [mkTestAdapter_(stubTest_({disabled: true}))]});

            const gui = initGuiReporter({toolAdapter, paths: ['foo']});

            return gui.initialize()
                .then(() => {
                    assert.notCalled(reportBuilder.addTestResult);
                });
        });

        it('should not add silently skipped test to report', () => {
            const testAdapter = mkTestAdapter_(stubTest_({silentSkip: true}));
            toolAdapter.readTests.resolves({tests: [testAdapter]});

            const gui = initGuiReporter({toolAdapter, paths: ['foo']});

            return gui.initialize()
                .then(() => {
                    assert.notCalled(reportBuilder.addTestResult);
                });
        });

        it('should not add test from silently skipped suite to report', () => {
            const silentlySkippedSuite = mkSuite({silentSkip: true});
            const testAdapter = mkTestAdapter_(stubTest_({parent: silentlySkippedSuite}));
            toolAdapter.readTests.resolves({tests: [testAdapter]});

            const gui = initGuiReporter({toolAdapter, paths: ['foo']});

            return gui.initialize()
                .then(() => {
                    assert.notCalled(reportBuilder.addTestResult);
                });
        });

        it('should add skipped test to report', () => {
            const testAdapter = mkTestAdapter_(stubTest_({pending: true}));
            toolAdapter.readTests.resolves({tests: [testAdapter]});

            const gui = initGuiReporter({toolAdapter, paths: ['foo']});

            return gui.initialize()
                .then(() => assert.calledOnce(reportBuilder.addTestResult));
        });

        it('should add idle test to report', () => {
            const testAdapter = mkTestAdapter_(stubTest_());
            toolAdapter.readTests.resolves({tests: [testAdapter]});

            const gui = initGuiReporter({toolAdapter, paths: ['foo']});

            return gui.initialize()
                .then(() => assert.calledOnce(reportBuilder.addTestResult));
        });

        it('should handle test results before read tests', () => {
            const testAdapter = mkTestAdapter_(stubTest_());
            toolAdapter.readTests.resolves({tests: [testAdapter]});

            const gui = initGuiReporter({toolAdapter, paths: ['foo']});

            return gui.initialize()
                .then(() => assert.callOrder(toolAdapter.handleTestResults, toolAdapter.readTests));
        });

        it('should initialize report builder after read tests for the correct order of events', async () => {
            const testAdapter = mkTestAdapter_(stubTest_());
            toolAdapter.readTests.resolves({tests: [testAdapter]});
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
                clone: () => testRefUpdateData[0],
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

            const testAdapter = mkTestAdapter_(testRefUpdateData[0]);
            const testCollection = {tests: [testAdapter]};
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
                clone: () => tests[0],
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

            const testCollection = {tests: [mkTestAdapter_(tests[0])]};
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
                clone: () => testRefUpdateData[0],
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

            const testCollection = {tests: [mkTestAdapter_(testRefUpdateData[0])]};
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
                clone: () => tests[0],
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

            const testCollection = {tests: [mkTestAdapter_(tests[0])]};
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

    describe('refreshTestsIfChanged', () => {
        it('should not read the full test collection after a structural change', async () => {
            const changedFile = '/ref/cwd/changed.hermione.ts';
            const oldTest = mkTestAdapter_(stubTest_({
                file: changedFile,
                browserId: 'yabro',
                fullTitle: () => 'old test'
            }));
            const newTest = mkTestAdapter_(stubTest_({
                file: changedFile,
                browserId: 'yabro',
                fullTitle: () => 'new test'
            }));
            const tree = {
                suites: {byId: {}, byHash: {}, allIds: [], allRootIds: []},
                browsers: {byId: {}, allIds: []},
                results: {byId: {}, allIds: []},
                images: {byId: {}, allIds: []}
            };
            toolAdapter.readTests.onFirstCall().resolves({tests: [oldTest]});
            toolAdapter.readTests.onSecondCall().resolves({tests: [newTest]});
            sandbox.stub(fs, 'pathExists').withArgs(changedFile).resolves(true);
            sandbox.stub(reportBuilder, 'testsTree').get(() => tree);
            const gui = initGuiReporter({toolAdapter});
            const onChanged = sandbox.stub();
            const onUpdated = sandbox.stub();

            await gui.initialize();
            await gui.refreshTestsIfChanged([changedFile], [], onChanged, onUpdated, 1);

            assert.callCount(toolAdapter.readTests, 2);
            assert.calledOnceWith(onChanged, true);
            assert.calledOnce(onUpdated);
            assert.calledOnceWith(reportBuilder.restoreTestHistory, [{
                suitePath: ['new', 'test'],
                browserId: 'yabro'
            }]);
        });

        it('should read all files when "only" is added and remove tests from other files', async () => {
            const focusedFile = '/ref/cwd/focused.hermione.ts';
            const otherFile = '/ref/cwd/other.hermione.ts';
            const focusedTest = mkTestAdapter_(stubTest_({file: focusedFile, browserId: 'yabro', fullTitle: () => 'focused test'}));
            const otherTest = mkTestAdapter_(stubTest_({file: otherFile, browserId: 'yabro', fullTitle: () => 'other test'}));
            const tree = {
                suites: {byId: {}, byHash: {}, allIds: [], allRootIds: []},
                browsers: {byId: {}, allIds: []},
                results: {byId: {}, allIds: []},
                images: {byId: {}, allIds: []}
            };
            toolAdapter.readTests.onFirstCall().resolves({tests: [focusedTest, otherTest], hasFocusedTests: false});
            toolAdapter.readTests.onSecondCall().resolves({tests: [focusedTest], hasFocusedTests: true});
            toolAdapter.readTests.onThirdCall().resolves({tests: [focusedTest], hasFocusedTests: true});
            sandbox.stub(fs, 'pathExists').withArgs(focusedFile).resolves(true);
            sandbox.stub(reportBuilder, 'testsTree').get(() => tree);
            const gui = initGuiReporter({toolAdapter, paths: ['tests/**/*.ts']});
            const onChanged = sandbox.stub();
            const onUpdated = sandbox.stub();

            await gui.initialize();
            await gui.refreshTestsIfChanged([focusedFile], [], onChanged, onUpdated, 1);

            assert.callCount(toolAdapter.readTests, 3);
            assert.deepEqual(toolAdapter.readTests.secondCall.args[0], [focusedFile]);
            assert.deepEqual(toolAdapter.readTests.thirdCall.args[0], ['tests/**/*.ts']);
            assert.calledOnceWith(onChanged, true);
            assert.calledOnce(reportBuilder.resetTree);
            assert.property(onUpdated.firstCall.args[0], 'replacement');
            assert.notCalled(reportBuilder.removeTestsByFiles);
        });

        it('should read all files when "only" is removed and restore tests from other files', async () => {
            const focusedFile = '/ref/cwd/focused.hermione.ts';
            const otherFile = '/ref/cwd/other.hermione.ts';
            const focusedTest = mkTestAdapter_(stubTest_({file: focusedFile, browserId: 'yabro', fullTitle: () => 'focused test'}));
            const otherTest = mkTestAdapter_(stubTest_({file: otherFile, browserId: 'yabro', fullTitle: () => 'other test'}));
            const tree = {
                suites: {byId: {}, byHash: {}, allIds: [], allRootIds: []},
                browsers: {byId: {}, allIds: []},
                results: {byId: {}, allIds: []},
                images: {byId: {}, allIds: []}
            };
            toolAdapter.readTests.onFirstCall().resolves({tests: [focusedTest], hasFocusedTests: true});
            toolAdapter.readTests.onSecondCall().resolves({tests: [focusedTest, otherTest], hasFocusedTests: false});
            sandbox.stub(fs, 'pathExists').withArgs(focusedFile).resolves(true);
            sandbox.stub(reportBuilder, 'testsTree').get(() => tree);
            const gui = initGuiReporter({toolAdapter, paths: ['tests/**/*.ts']});
            const onChanged = sandbox.stub();
            const onUpdated = sandbox.stub();

            await gui.initialize();
            await gui.refreshTestsIfChanged([focusedFile], [], onChanged, onUpdated, 1);

            assert.callCount(toolAdapter.readTests, 2);
            assert.deepEqual(toolAdapter.readTests.secondCall.args[0], ['tests/**/*.ts']);
            assert.calledOnceWith(onChanged, true);
            assert.calledOnce(reportBuilder.resetTree);
            assert.property(onUpdated.firstCall.args[0], 'replacement');
            assert.notCalled(reportBuilder.removeTestsByFiles);
        });

        it('should remove all tests when an empty focused suite is added', async () => {
            const focusedFile = '/ref/cwd/focused.hermione.ts';
            const otherFile = '/ref/cwd/other.hermione.ts';
            const focusedTest = mkTestAdapter_(stubTest_({file: focusedFile, browserId: 'yabro', fullTitle: () => 'focused test'}));
            const otherTest = mkTestAdapter_(stubTest_({file: otherFile, browserId: 'yabro', fullTitle: () => 'other test'}));
            const noTestsError = new Error('There are no tests found. Try to specify options');
            const tree = {
                suites: {byId: {}, byHash: {}, allIds: [], allRootIds: []},
                browsers: {byId: {}, allIds: []},
                results: {byId: {}, allIds: []},
                images: {byId: {}, allIds: []}
            };
            toolAdapter.hasFocusedTestsInLastRead = false;
            toolAdapter.readTests.onFirstCall().resolves({tests: [focusedTest, otherTest], hasFocusedTests: false});
            toolAdapter.readTests.onSecondCall().callsFake(async () => {
                toolAdapter.hasFocusedTestsInLastRead = true;
                throw noTestsError;
            });
            toolAdapter.readTests.onThirdCall().rejects(noTestsError);
            sandbox.stub(fs, 'pathExists').withArgs(focusedFile).resolves(true);
            sandbox.stub(reportBuilder, 'testsTree').get(() => tree);
            const gui = initGuiReporter({toolAdapter, paths: ['tests/**/*.ts']});
            const onChanged = sandbox.stub();
            const onUpdated = sandbox.stub();

            await gui.initialize();
            await gui.refreshTestsIfChanged([focusedFile], [], onChanged, onUpdated, 1);

            assert.callCount(toolAdapter.readTests, 3);
            assert.calledOnceWith(onChanged, true);
            assert.calledOnce(reportBuilder.resetTree);
            assert.property(onUpdated.firstCall.args[0], 'replacement');
            assert.notCalled(reportBuilder.removeTestsByFiles);
        });

        it('should treat a changed file with no tests as an empty partial collection', async () => {
            const changedFile = '/ref/cwd/changed.hermione.ts';
            const oldTest = mkTestAdapter_(stubTest_({
                file: changedFile,
                browserId: 'yabro',
                fullTitle: () => 'old test'
            }));
            const tree = {
                suites: {byId: {}, byHash: {}, allIds: [], allRootIds: []},
                browsers: {byId: {}, allIds: []},
                results: {byId: {}, allIds: []},
                images: {byId: {}, allIds: []}
            };
            toolAdapter.readTests.onFirstCall().resolves({tests: [oldTest]});
            toolAdapter.readTests.onSecondCall().rejects(new Error('There are no tests found. Try to specify options'));
            sandbox.stub(fs, 'pathExists').withArgs(changedFile).resolves(true);
            sandbox.stub(reportBuilder, 'testsTree').get(() => tree);
            const gui = initGuiReporter({toolAdapter});
            const onChanged = sandbox.stub();
            const onUpdated = sandbox.stub();

            await gui.initialize();
            await gui.refreshTestsIfChanged([changedFile], [], onChanged, onUpdated, 1);

            assert.callCount(toolAdapter.readTests, 2);
            assert.calledOnceWith(onChanged, true);
            assert.calledOnce(onUpdated);
        });

        it('should lazily read only the selected test file before running changed code', async () => {
            const changedFile = '/ref/cwd/changed.hermione.ts';
            const test = mkTestAdapter_(stubTest_({
                file: changedFile,
                browserId: 'yabro',
                fullTitle: () => 'same test'
            }));
            toolAdapter.readTests.resolves({tests: [test]});
            sandbox.stub(fs, 'pathExists').withArgs(changedFile).resolves(true);
            const gui = initGuiReporter({toolAdapter});

            await gui.initialize();
            await gui.refreshTestsIfChanged([changedFile], [], sandbox.stub(), sandbox.stub(), 1);
            await gui.run([{testName: 'same test', browserName: 'yabro'}]);

            assert.callCount(toolAdapter.readTests, 3);
            assert.deepEqual(toolAdapter.readTests.thirdCall.args[0], [changedFile]);
        });

        ['pending', 'disabled', 'silentSkip'].forEach(property => {
            it(`should refresh tree when test "${property}" state changes`, async () => {
                const changedFile = '/ref/cwd/changed.hermione.ts';
                const oldTest = mkTestAdapter_(stubTest_({file: changedFile, browserId: 'yabro', [property]: false}));
                const newTest = mkTestAdapter_(stubTest_({file: changedFile, browserId: 'yabro', [property]: true}));
                const tree = {
                    suites: {byId: {}, byHash: {}, allIds: [], allRootIds: []},
                    browsers: {byId: {}, allIds: []},
                    results: {byId: {}, allIds: []},
                    images: {byId: {}, allIds: []}
                };
                toolAdapter.readTests.onFirstCall().resolves({tests: [oldTest]});
                toolAdapter.readTests.onSecondCall().resolves({tests: [newTest]});
                sandbox.stub(fs, 'pathExists').withArgs(changedFile).resolves(true);
                sandbox.stub(reportBuilder, 'testsTree').get(() => tree);
                const gui = initGuiReporter({toolAdapter});
                const onChanged = sandbox.stub();

                await gui.initialize();
                await gui.refreshTestsIfChanged([changedFile], [], onChanged, sandbox.stub(), 1);

                assert.calledOnceWith(onChanged, true);
            });
        });

        it('should keep current idle state after removing pending from a test with skipped history', async () => {
            const changedFile = '/ref/cwd/changed.hermione.ts';
            const skippedTest = mkTestAdapter_(stubTest_({file: changedFile, browserId: 'yabro', pending: true}));
            const activeTest = mkTestAdapter_(stubTest_({file: changedFile, browserId: 'yabro', pending: false}));
            const tree = {
                suites: {byId: {}, byHash: {}, allIds: [], allRootIds: []},
                browsers: {byId: {}, allIds: []},
                results: {byId: {}, allIds: []},
                images: {byId: {}, allIds: []}
            };
            toolAdapter.readTests.onFirstCall().resolves({tests: [skippedTest]});
            toolAdapter.readTests.onSecondCall().resolves({tests: [activeTest]});
            sandbox.stub(fs, 'pathExists').withArgs(changedFile).resolves(true);
            sandbox.stub(reportBuilder, 'testsTree').get(() => tree);
            reportBuilder.restoreTestHistory.returns(true);
            const gui = initGuiReporter({toolAdapter});

            await gui.initialize();
            reportBuilder.addTestResult.resetHistory();
            await gui.refreshTestsIfChanged([changedFile], [], sandbox.stub(), sandbox.stub(), 1);

            assert.calledTwice(reportBuilder.addTestResult);
            assert.equal(reportBuilder.addTestResult.firstCall.args[0].status, IDLE);
            assert.equal(reportBuilder.addTestResult.secondCall.args[0].status, IDLE);
        });

        it('should reject a duplicate full name introduced by a partial read', async () => {
            const existingFile = '/ref/cwd/existing.hermione.ts';
            const changedFile = '/ref/cwd/changed.hermione.ts';
            const existingTest = mkTestAdapter_(stubTest_({file: existingFile, browserId: 'yabro', fullTitle: () => 'duplicate'}));
            const oldChangedTest = mkTestAdapter_(stubTest_({file: changedFile, browserId: 'yabro', fullTitle: () => 'old'}));
            const duplicateTest = mkTestAdapter_(stubTest_({file: changedFile, browserId: 'yabro', fullTitle: () => 'duplicate'}));
            toolAdapter.readTests.onFirstCall().resolves({tests: [existingTest, oldChangedTest]});
            toolAdapter.readTests.onSecondCall().resolves({tests: [duplicateTest]});
            sandbox.stub(fs, 'pathExists').withArgs(changedFile).resolves(true);
            const gui = initGuiReporter({toolAdapter});

            await gui.initialize();

            await assert.isRejected(
                gui.refreshTestsIfChanged([changedFile], [], sandbox.stub(), sandbox.stub(), 1),
                /Tests with the same title 'duplicate'/
            );
            assert.notCalled(reportBuilder.removeTestsByFiles);
        });

        it('should restore report builder state when applying a patch fails', async () => {
            const changedFile = '/ref/cwd/changed.hermione.ts';
            const oldTest = mkTestAdapter_(stubTest_({file: changedFile, browserId: 'yabro', fullTitle: () => 'old'}));
            const newTest = mkTestAdapter_(stubTest_({file: changedFile, browserId: 'yabro', fullTitle: () => 'new'}));
            const tree = {
                suites: {byId: {}, byHash: {}, allIds: [], allRootIds: []},
                browsers: {byId: {}, allIds: []},
                results: {byId: {}, allIds: []},
                images: {byId: {}, allIds: []}
            };
            const snapshot = {treeState: {tree, browserIdsByFile: new Map()}, skips: []};
            toolAdapter.readTests.onFirstCall().resolves({tests: [oldTest]});
            toolAdapter.readTests.onSecondCall().resolves({tests: [newTest]});
            sandbox.stub(fs, 'pathExists').withArgs(changedFile).resolves(true);
            sandbox.stub(reportBuilder, 'testsTree').get(() => tree);
            reportBuilder.snapshotTestsState.returns(snapshot);
            reportBuilder.restoreTestHistory.throws(new Error('history failed'));
            const gui = initGuiReporter({toolAdapter});

            await gui.initialize();

            await assert.isRejected(
                gui.refreshTestsIfChanged([changedFile], [], sandbox.stub(), sandbox.stub(), 1),
                /history failed/
            );
            assert.calledOnceWith(reportBuilder.restoreTestsState, snapshot);
            assert.equal(gui._testAdapters['some-id'], oldTest);
            assert.deepEqual([...gui._testAdapterIdsByFile.get(changedFile)], ['some-id']);
        });
    });

    describe('findEqualDiffs', () => {
        let compareOpts;

        beforeEach(() => {
            toolAdapter = stubToolAdapter({
                config: stubConfig({tolerance: 100500, antialiasingTolerance: 500100}),
                reporterConfig: stubReporterConfig({path: 'report_path'})
            });
            toolAdapter.readTests.resolves({tests: []});

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
        it('should call "run" tool method if tests are not passed', async () => {
            const cliTool = {grep: /some-grep/, set: 'some-set', browser: 'yabro', devtools: true};
            const tests = [];
            const collection = {tests};
            toolAdapter.readTests.resolves(collection);

            const gui = initGuiReporter({toolAdapter, cli: {tool: cliTool, options: {}}});

            await gui.initialize();
            await gui.run(tests);

            assert.calledOnceWith(toolAdapter.run, collection, tests, cliTool);
        });

        it('should call "runWithoutRetries" tool method if tests are not passed', async () => {
            const cliTool = {grep: /some-grep/, set: 'some-set', browser: 'yabro', devtools: true};
            const tests = [stubTest_()];
            const collection = {tests: [mkTestAdapter_(tests[0])]};
            toolAdapter.readTests.resolves(collection);

            const gui = initGuiReporter({toolAdapter, cli: {tool: cliTool, options: {}}});

            await gui.initialize();
            await gui.run(tests);

            assert.calledOnceWith(toolAdapter.runWithoutRetries, collection, tests, cliTool);
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
            getTestsTreeFromDatabase.resolves({});

            await gui.initialize();

            assert.notCalled(reportBuilder.reuseTestsTree);
        });

        it('should reuse tests tree', async () => {
            fs.pathExists.withArgs(dbPath).resolves(true);
            getTestsTreeFromDatabase.resolves('tests-tree');

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
