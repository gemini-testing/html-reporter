import Testplane, {type TestCollection} from 'testplane';
import proxyquire from 'proxyquire';
import sinon, {SinonStub} from 'sinon';
import P from 'bluebird';
import type {CommanderStatic} from '@gemini-testing/commander';

import {HtmlReporter} from '../../../../../../lib/plugin-api';
import {ToolName} from '../../../../../../lib/constants';
import {GuiApi} from '../../../../../../lib/gui/api';
import {GuiReportBuilder} from '../../../../../../lib/report-builder/gui';
import {EventSource} from '../../../../../../lib/gui/event-source';
import {TestplaneTestCollectionAdapter} from '../../../../../../lib/adapters/test-collection/testplane';

import {stubTool, stubConfig, stubTestCollection} from '../../../../utils';
import type {ReporterConfig} from '../../../../../../lib/types';
import type {TestSpec} from '../../../../../../lib/adapters/tool/types';

describe('lib/adapters/tool/testplane/index', () => {
    const sandbox = sinon.sandbox.create();
    let TestplaneToolAdapter: typeof import('../../../../../../lib/adapters/tool/testplane').TestplaneToolAdapter;
    let parseConfigStub: SinonStub;
    let createTestRunnerStub: SinonStub;
    let handleTestResultsStub: SinonStub;

    beforeEach(() => {
        sandbox.stub(Testplane, 'create').returns(stubTool());
        sandbox.stub(HtmlReporter, 'create').returns({});
        sandbox.stub(GuiApi, 'create').returns({});

        parseConfigStub = sandbox.stub();
        createTestRunnerStub = sandbox.stub();
        handleTestResultsStub = sandbox.stub();

        TestplaneToolAdapter = proxyquire('../../../../../../lib/adapters/tool/testplane', {
            '../../../config': {parseConfig: parseConfigStub},
            './runner': {createTestRunner: createTestRunnerStub},
            './test-results-handler': {handleTestResults: handleTestResultsStub}
        }).TestplaneToolAdapter;
    });

    afterEach(() => {
        sandbox.restore();

        delete process.env['html_reporter_enabled'];
    });

    describe('constructor', () => {
        describe('used from cli', () => {
            it('should disable html reporter plugin in order to not generate static report', () => {
                TestplaneToolAdapter.create({toolName: ToolName.Testplane});

                assert.equal(process.env['html_reporter_enabled'], 'false');
            });

            it('should create testplane instance with path to config file', () => {
                const configPath = '/some/config/path';

                TestplaneToolAdapter.create({toolName: ToolName.Testplane, configPath});

                assert.calledOnceWith(Testplane.create as SinonStub, configPath);
            });

            [ToolName.Testplane, 'hermione'].forEach(toolName => {
                it(`should parse reporter opts from "html-reporter/${toolName}" plugin in config`, () => {
                    const pluginOpts = {
                        enabled: true,
                        path: 'hermione-report'
                    };
                    const config = stubConfig({plugins: {
                        [`html-reporter/${toolName}`]: pluginOpts
                    }});
                    const testplane = stubTool(config);
                    (Testplane.create as SinonStub).returns(testplane);

                    TestplaneToolAdapter.create({toolName: ToolName.Testplane});

                    assert.calledOnceWith(parseConfigStub, pluginOpts);
                });
            });

            it('should use default opts if html-reporter plugin is not found in config', () => {
                const config = stubConfig({plugins: {}});
                const testplane = stubTool(config);
                (Testplane.create as SinonStub).returns(testplane);

                TestplaneToolAdapter.create({toolName: ToolName.Testplane});

                assert.calledOnceWith(parseConfigStub, {});
            });

            it('should init htmlReporter instance with parsed reporter config', () => {
                const reporterConfig = {path: 'some/path'} as ReporterConfig;
                parseConfigStub.returns(reporterConfig);

                TestplaneToolAdapter.create({toolName: ToolName.Testplane});

                assert.calledOnceWith(HtmlReporter.create as SinonStub, reporterConfig, {toolName: ToolName.Testplane});
            });

            it('should set "htmlReporter field in testplane to use from other plugins', () => {
                const testplane = stubTool();
                const htmlReporter = sinon.createStubInstance(HtmlReporter);
                (Testplane.create as SinonStub).returns(testplane);
                (HtmlReporter.create as SinonStub).returns(htmlReporter);

                TestplaneToolAdapter.create({toolName: ToolName.Testplane});

                assert.equal(testplane.htmlReporter, htmlReporter);
            });
        });

        describe('used from plugin', () => {
            it('should use passed testplane instance', () => {
                const reporterConfig = {path: 'some/path'} as ReporterConfig;

                TestplaneToolAdapter.create({toolName: ToolName.Testplane, tool: stubTool(), reporterConfig});

                assert.notCalled(Testplane.create as SinonStub);
            });

            it('should init htmlReporter instance with passed reporter config', () => {
                const reporterConfig = {path: 'some/path'} as ReporterConfig;

                TestplaneToolAdapter.create({toolName: ToolName.Testplane, tool: stubTool(), reporterConfig});

                assert.calledOnceWith(HtmlReporter.create as SinonStub, reporterConfig, {toolName: ToolName.Testplane});
            });

            it('should set "htmlReporter field in testplane to use from other plugins', () => {
                const testplane = stubTool();
                const htmlReporter = sinon.createStubInstance(HtmlReporter);
                (HtmlReporter.create as SinonStub).returns(htmlReporter);

                TestplaneToolAdapter.create({toolName: ToolName.Testplane, tool: testplane, reporterConfig: {} as ReporterConfig});

                assert.equal(testplane.htmlReporter, htmlReporter);
            });
        });
    });

    describe('initGuiApi', () => {
        it('should set "gui" field in testplane to use from other plugins', () => {
            const testplane = stubTool();
            const gui = {};
            (GuiApi.create as SinonStub).returns({gui});

            const toolAdapter = TestplaneToolAdapter.create({toolName: ToolName.Testplane, tool: testplane, reporterConfig: {} as ReporterConfig});
            toolAdapter.initGuiApi();

            assert.equal(testplane.gui, gui);
        });
    });

    describe('readTests', () => {
        it('should correctly pass "paths" to the tests', async () => {
            const testplane = stubTool();
            const toolAdapter = TestplaneToolAdapter.create({toolName: ToolName.Testplane, tool: testplane, reporterConfig: {} as ReporterConfig});

            await toolAdapter.readTests(['foo', 'bar'], {} as CommanderStatic);

            assert.calledOnceWith(testplane.readTests, ['foo', 'bar']);
        });

        it('should correctly pass cli options', async () => {
            const testplane = stubTool();
            const toolAdapter = TestplaneToolAdapter.create({toolName: ToolName.Testplane, tool: testplane, reporterConfig: {} as ReporterConfig});
            const cliTool = {grep: 'foo', set: 'bar', browser: 'yabro'} as unknown as CommanderStatic;

            await toolAdapter.readTests([], cliTool);

            assert.calledOnceWith(testplane.readTests, sinon.match.any, sinon.match({
                grep: cliTool.grep,
                sets: cliTool.set,
                browsers: cliTool.browser
            }));
        });

        describe('"replMode" option', () => {
            it('should be disabled by default', async () => {
                const testplane = stubTool();
                const toolAdapter = TestplaneToolAdapter.create({toolName: ToolName.Testplane, tool: testplane, reporterConfig: {} as ReporterConfig});

                await toolAdapter.readTests([], {} as CommanderStatic);

                assert.calledOnceWith(testplane.readTests, sinon.match.any, sinon.match({
                    replMode: {
                        enabled: false,
                        beforeTest: false,
                        onFail: false
                    }
                }));
            });

            it('should be enabled when specify "repl" flag', async () => {
                const testplane = stubTool();
                const toolAdapter = TestplaneToolAdapter.create({toolName: ToolName.Testplane, tool: testplane, reporterConfig: {} as ReporterConfig});

                await toolAdapter.readTests([], {repl: true} as unknown as CommanderStatic);

                assert.calledOnceWith(testplane.readTests, sinon.match.any, sinon.match({
                    replMode: {
                        enabled: true,
                        beforeTest: false,
                        onFail: false
                    }
                }));
            });

            it('should be enabled when specify "beforeTest" flag', async () => {
                const testplane = stubTool();
                const toolAdapter = TestplaneToolAdapter.create({toolName: ToolName.Testplane, tool: testplane, reporterConfig: {} as ReporterConfig});

                await toolAdapter.readTests([], {replBeforeTest: true} as unknown as CommanderStatic);

                assert.calledOnceWith(testplane.readTests, sinon.match.any, sinon.match({
                    replMode: {
                        enabled: true,
                        beforeTest: true,
                        onFail: false
                    }
                }));
            });

            it('should be enabled when specify "onFail" flag', async () => {
                const testplane = stubTool();
                const toolAdapter = TestplaneToolAdapter.create({toolName: ToolName.Testplane, tool: testplane, reporterConfig: {} as ReporterConfig});

                await toolAdapter.readTests([], {replOnFail: true} as unknown as CommanderStatic);

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

    describe('run', () => {
        let collection: TestCollection;
        let runner: {run: SinonStub};

        const run_ = async (testplane: Testplane, collectionAdapter: TestplaneTestCollectionAdapter, tests: TestSpec[], cliTool: CommanderStatic): Promise<void> => {
            const toolAdapter = TestplaneToolAdapter.create({toolName: ToolName.Testplane, tool: testplane, reporterConfig: {} as ReporterConfig});

            await toolAdapter.run(collectionAdapter, tests, cliTool);

            const runHandler = runner.run.firstCall.args[0];
            await runHandler(collectionAdapter.original);
        };

        beforeEach(() => {
            collection = stubTestCollection() as TestCollection;
            runner = {run: sandbox.stub().resolves()};

            createTestRunnerStub.returns(runner);
        });

        it('should run testplane with passed opts', async () => {
            const testplane = stubTool();
            const tests = [] as TestSpec[];
            const cliTool = {grep: /some-grep/, set: 'some-set', browser: 'yabro', devtools: true} as unknown as CommanderStatic;

            await run_(testplane, TestplaneTestCollectionAdapter.create(collection), tests, cliTool);

            assert.calledOnceWith(testplane.run, collection, sinon.match({
                grep: cliTool.grep,
                sets: cliTool.set,
                browsers: cliTool.browser,
                devtools: cliTool.devtools
            }));
        });

        describe('"replMode" option', () => {
            it('should be disabled by default', async () => {
                const testplane = stubTool();
                const tests = [] as TestSpec[];
                const cliTool = {} as unknown as CommanderStatic;

                await run_(testplane, TestplaneTestCollectionAdapter.create(collection), tests, cliTool);

                assert.calledOnceWith(testplane.run, collection, sinon.match({
                    replMode: {
                        enabled: false,
                        beforeTest: false,
                        onFail: false
                    }
                }));
            });

            it('should be enabled when specify "repl" flag', async () => {
                const testplane = stubTool();
                const tests = [] as TestSpec[];
                const cliTool = {repl: true} as unknown as CommanderStatic;

                await run_(testplane, TestplaneTestCollectionAdapter.create(collection), tests, cliTool);

                assert.calledOnceWith(testplane.run, collection, sinon.match({
                    replMode: {
                        enabled: true,
                        beforeTest: false,
                        onFail: false
                    }
                }));
            });

            it('should be enabled when specify "beforeTest" flag', async () => {
                const testplane = stubTool();
                const tests = [] as TestSpec[];
                const cliTool = {replBeforeTest: true} as unknown as CommanderStatic;

                await run_(testplane, TestplaneTestCollectionAdapter.create(collection), tests, cliTool);

                assert.calledOnceWith(testplane.run, collection, sinon.match({
                    replMode: {
                        enabled: true,
                        beforeTest: true,
                        onFail: false
                    }
                }));
            });

            it('should be enabled when specify "onFail" flag', async () => {
                const testplane = stubTool();
                const tests = [] as TestSpec[];
                const cliTool = {replOnFail: true} as unknown as CommanderStatic;

                await run_(testplane, TestplaneTestCollectionAdapter.create(collection), tests, cliTool);

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

    describe('runWithoutRetries', () => {
        let collection: TestCollection;

        beforeEach(() => {
            collection = stubTestCollection() as TestCollection;
        });

        it('should call "run" method with correct args', async () => {
            const cliTool = {} as unknown as CommanderStatic;
            const tests = [
                {testName: 'foo', browserName: 'yabro'}
            ];
            const config = stubConfig({
                browsers: {
                    yabro: {id: 'yabro', retry: 1}
                }
            });
            const testplane = stubTool(config);
            const testCollection = TestplaneTestCollectionAdapter.create(collection);

            const toolAdapter = TestplaneToolAdapter.create({toolName: ToolName.Testplane, tool: testplane, reporterConfig: {} as ReporterConfig});
            sandbox.stub(toolAdapter, 'run').resolves();

            await toolAdapter.runWithoutRetries(testCollection, tests, cliTool);

            assert.calledOnceWith(toolAdapter.run as SinonStub, testCollection, tests, cliTool);
        });

        it('should run specified tests with no retries', async () => {
            const tests = [
                {testName: 'foo', browserName: 'yabro1'},
                {testName: 'bar', browserName: 'yabro2'}
            ];
            const config = stubConfig({
                browsers: {
                    yabro1: {id: 'yabro1', retry: 1},
                    yabro2: {id: 'yabro2', retry: 2}
                }
            });
            const testplane = stubTool(config);

            let yabro1RetryBeforeRun!: number;
            let yabro2RetryBeforeRun!: number;

            const toolAdapter = TestplaneToolAdapter.create({toolName: ToolName.Testplane, tool: testplane, reporterConfig: {} as ReporterConfig});
            sandbox.stub(toolAdapter, 'run').resolves();

            (toolAdapter.run as SinonStub).callsFake(() => {
                yabro1RetryBeforeRun = testplane.config.forBrowser('yabro1').retry;
                yabro2RetryBeforeRun = testplane.config.forBrowser('yabro2').retry;

                return Promise.resolve();
            });

            await toolAdapter.runWithoutRetries(TestplaneTestCollectionAdapter.create(collection), tests, {} as CommanderStatic);

            assert.equal(yabro1RetryBeforeRun, 0);
            assert.equal(yabro2RetryBeforeRun, 0);
        });

        it('should restore config retry values after run', async () => {
            const tests = [
                {testName: 'foo', browserName: 'yabro1'},
                {testName: 'bar', browserName: 'yabro2'}
            ];
            const config = stubConfig({
                browsers: {
                    yabro1: {id: 'yabro1', retry: 1},
                    yabro2: {id: 'yabro2', retry: 2}
                }
            });
            const testplane = stubTool(config);

            const toolAdapter = TestplaneToolAdapter.create({toolName: ToolName.Testplane, tool: testplane, reporterConfig: {} as ReporterConfig});
            sandbox.stub(toolAdapter, 'run').resolves();

            await toolAdapter.runWithoutRetries(TestplaneTestCollectionAdapter.create(collection), tests, {} as CommanderStatic);

            assert.equal(testplane.config.forBrowser('yabro1').retry, 1);
            assert.equal(testplane.config.forBrowser('yabro2').retry, 2);
        });

        it('should restore config retry values even after error', async () => {
            const tests = [
                {testName: 'foo', browserName: 'yabro1'},
                {testName: 'bar', browserName: 'yabro2'}
            ];
            const config = stubConfig({
                browsers: {
                    yabro1: {id: 'yabro1', retry: 1},
                    yabro2: {id: 'yabro2', retry: 2}
                }
            });
            const testplane = stubTool(config);

            const toolAdapter = TestplaneToolAdapter.create({toolName: ToolName.Testplane, tool: testplane, reporterConfig: {} as ReporterConfig});
            sandbox.stub(toolAdapter, 'run').rejects(new Error('o.O'));

            try {
                await toolAdapter.runWithoutRetries(TestplaneTestCollectionAdapter.create(collection), tests, {} as CommanderStatic);
            } catch {
                assert.equal(testplane.config.forBrowser('yabro1').retry, 1);
                assert.equal(testplane.config.forBrowser('yabro2').retry, 2);
            }
        });
    });

    describe('updateReference', () => {
        it('should emit "UPDATE_REFERENCE" event with passed options', () => {
            const testplane = stubTool();
            const toolAdapter = TestplaneToolAdapter.create({toolName: ToolName.Testplane, tool: testplane, reporterConfig: {} as ReporterConfig});
            const onUpdateReference = sinon.spy();
            const updateOpts = {
                refImg: {path: '/ref/path', size: {height: 100, width: 200}},
                state: 'plain'
            };

            testplane.on(testplane.events.UPDATE_REFERENCE, onUpdateReference);
            toolAdapter.updateReference(updateOpts);

            assert.calledOnceWith(onUpdateReference, updateOpts);
        });
    });

    describe('handleTestResults', () => {
        it('should call test results handler with correct args', () => {
            const testplane = stubTool();
            const toolAdapter = TestplaneToolAdapter.create({toolName: ToolName.Testplane, tool: testplane, reporterConfig: {} as ReporterConfig});
            const reportBuilder = {} as GuiReportBuilder;
            const eventSource = {} as EventSource;

            toolAdapter.handleTestResults(reportBuilder, eventSource);

            assert.calledOnceWith(handleTestResultsStub, testplane, reportBuilder, eventSource);
        });
    });

    describe('halt', () => {
        it('should halt testplane', () => {
            const testplane = stubTool();
            const toolAdapter = TestplaneToolAdapter.create({toolName: ToolName.Testplane, tool: testplane, reporterConfig: {} as ReporterConfig});
            const error = new Error('o.O');
            const timeout = 100500;

            toolAdapter.halt(error, timeout);

            assert.calledOnceWith(testplane.halt, error, timeout);
        });
    });

    describe('initGuiHandler', () => {
        it('should initialize each group of controls if initialize-function is available', async () => {
            const initializeSpy1 = sinon.spy();
            const initializeSpy2 = sinon.spy();

            const initialize1 = sinon.stub().callsFake(() => P.delay(5).then(initializeSpy1));
            const initialize2 = sinon.stub().callsFake(() => P.delay(10).then(initializeSpy2));

            const ctx1 = {initialize: initialize1};
            const ctx2 = {initialize: initialize2};

            const reporterConfig = {
                customGui: {'section-1': [ctx1], 'section-2': [ctx2]}
            } as unknown as ReporterConfig;
            const testplane = stubTool();

            const toolAdapter = TestplaneToolAdapter.create({toolName: ToolName.Testplane, tool: testplane, reporterConfig});

            await toolAdapter.initGuiHandler();

            assert.calledOnceWith(initialize1, {testplane, hermione: testplane, ctx: ctx1});
            assert.calledOnceWith(initialize2, {testplane, hermione: testplane, ctx: ctx2});
            assert.callOrder(initializeSpy1, initializeSpy2);
        });
    });

    describe('runCustomGuiAction', () => {
        it('should run action for specified controls', async () => {
            const actionSpy = sinon.spy();
            const action = sinon.stub().callsFake(() => P.delay(10).then(actionSpy));

            const control = {};
            const ctx = {controls: [control], action};
            const reporterConfig = {customGui: {'section': [ctx]}} as unknown as ReporterConfig;
            const testplane = stubTool();

            const toolAdapter = TestplaneToolAdapter.create({toolName: ToolName.Testplane, tool: testplane, reporterConfig});

            await toolAdapter.runCustomGuiAction({
                sectionName: 'section',
                groupIndex: 0,
                controlIndex: 0
            });

            assert.calledOnceWith(action, {testplane, hermione: testplane, ctx, control});
            assert.calledOnce(actionSpy);
        });
    });
});
