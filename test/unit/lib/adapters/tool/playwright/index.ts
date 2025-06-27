import path from 'node:path';
import childProcess, {type ChildProcessWithoutNullStreams} from 'node:child_process';
import {EventEmitter} from 'node:events';
import type {Readable} from 'node:stream';

import P from 'bluebird';
import {FullConfig} from '@playwright/test/reporter';
import proxyquire from 'proxyquire';
import sinon, {SinonStub} from 'sinon';
import npmWhich from 'npm-which';

import {DEFAULT_CONFIG_PATHS, type PlaywrightToolAdapter} from '../../../../../../lib/adapters/tool/playwright';
import {PlaywrightTestCollectionAdapter} from '../../../../../../lib/adapters/test-collection/playwright';
import {PlaywrightTestResultAdapter} from '../../../../../../lib/adapters/test-result/playwright';
import {DEFAULT_BROWSER_ID} from '../../../../../../lib/adapters/config/playwright';
import {HtmlReporter} from '../../../../../../lib/plugin-api';
import {ToolName, UNKNOWN_ATTEMPT, TestStatus} from '../../../../../../lib/constants';
import {ClientEvents} from '../../../../../../lib/gui/constants';

import type {ReporterConfig} from '../../../../../../lib/types';
import type {TestSpec} from '../../../../../../lib/adapters/tool/types';
import type {ToolAdapterOptionsFromCli} from '../../../../../../lib/adapters/tool';
import type {GuiReportBuilder} from '../../../../../../lib/report-builder/gui';
import type {EventSource} from '../../../../../../lib/gui/event-source';

describe('lib/adapters/tool/playwright/index', () => {
    const sandbox = sinon.sandbox.create();

    let PlaywrightToolAdapter: typeof import('../../../../../../lib/adapters/tool/playwright').PlaywrightToolAdapter;
    let parseConfigStub: SinonStub;
    let setupTransformHookStub: SinonStub;
    let ipcStub: EventEmitter;

    const proxyquirePwtToolAdapter = (stubs: Record<string, unknown> = {}): typeof PlaywrightToolAdapter => {
        return proxyquire.noCallThru().load('../../../../../../lib/adapters/tool/playwright', {
            '../../../config': {parseConfig: parseConfigStub},
            './transformer': {setupTransformHook: setupTransformHookStub},
            './ipc': ipcStub,
            ...stubs
        }).PlaywrightToolAdapter;
    };

    const createPwtToolAdapter = async (opts: ToolAdapterOptionsFromCli, config: FullConfig = {} as FullConfig): Promise<PlaywrightToolAdapter> => {
        PlaywrightToolAdapter = proxyquirePwtToolAdapter(opts.configPath ? {[path.resolve(opts.configPath)]: config} : {});

        return PlaywrightToolAdapter.create(opts);
    };

    const mkSpawnInstance_ = (): ChildProcessWithoutNullStreams => {
        const instance = new EventEmitter() as ChildProcessWithoutNullStreams;
        instance.stdout = new EventEmitter() as Readable;
        instance.stderr = new EventEmitter() as Readable;

        return instance;
    };

    const mkReportBuilder_ = (): GuiReportBuilder => ({
        addTestResult: sinon.stub().resolves({}),
        getTestBranch: sinon.stub().returns({})
    } as unknown as GuiReportBuilder);

    beforeEach(() => {
        sandbox.stub(HtmlReporter, 'create').returns({});
        sandbox.stub(PlaywrightTestCollectionAdapter, 'create').returns({});
        sandbox.stub(PlaywrightTestResultAdapter, 'create').returns({});
        sandbox.stub(npmWhich, 'sync').returns('/default/node_modules/.bin/playwright');
        sandbox.stub(childProcess, 'spawn').returns(mkSpawnInstance_());

        ipcStub = new EventEmitter();
        parseConfigStub = sandbox.stub();
        setupTransformHookStub = sandbox.stub().returns(sinon.stub());
    });

    afterEach(() => sandbox.restore());

    describe('constructor', () => {
        describe('should read config', () => {
            it('passed by user', async () => {
                const configPath = './pwt.config.ts';

                const toolAdapter = await createPwtToolAdapter({toolName: ToolName.Playwright, configPath});

                assert.equal(toolAdapter.configPath, path.resolve(configPath));
            });

            DEFAULT_CONFIG_PATHS.forEach(configPath => {
                it(`from "${configPath}" by default`, async () => {
                    const stubs = {[path.resolve(configPath)]: {}};
                    const PlaywrightToolAdapter = proxyquirePwtToolAdapter(stubs);

                    const toolAdapter = await PlaywrightToolAdapter.create({toolName: ToolName.Playwright});

                    assert.equal(toolAdapter.configPath, path.resolve(configPath));
                });
            });
        });

        it('should throw error if config file is not found', async () => {
            await assert.isRejected(
                createPwtToolAdapter({toolName: ToolName.Playwright}),
                `Unable to read config from paths: ${DEFAULT_CONFIG_PATHS.join(', ')}`
            );
        });

        describe('parse options from "html-reporter/playwright" reporter', () => {
            describe('should call parser with empty opts if "reporter" option', () => {
                it('does not exists in config', async () => {
                    const config = {} as unknown as FullConfig;

                    await createPwtToolAdapter({toolName: ToolName.Playwright, configPath: './pwt.config.ts'}, config);

                    assert.calledOnceWith(parseConfigStub, {});
                });

                it('specified as string', async () => {
                    const config = {reporter: 'html-reporter/playwright'} as unknown as FullConfig;

                    await createPwtToolAdapter({toolName: ToolName.Playwright, configPath: './pwt.config.ts'}, config);

                    assert.calledOnceWith(parseConfigStub, {});
                });

                it('specified as string inside array', async () => {
                    const config = {reporter: [['line'], ['html-reporter/playwright']]} as unknown as FullConfig;

                    await createPwtToolAdapter({toolName: ToolName.Playwright, configPath: './pwt.config.ts'}, config);

                    assert.calledOnceWith(parseConfigStub, {});
                });
            });

            it('should call parser with specified opts', async () => {
                const pluginOpts = {
                    enabled: true,
                    path: 'playwright-report'
                };
                const config = {reporter: [['html-reporter/playwright', pluginOpts]]} as unknown as FullConfig;

                await createPwtToolAdapter({toolName: ToolName.Playwright, configPath: './pwt.config.ts'}, config);

                assert.calledOnceWith(parseConfigStub, pluginOpts);
            });
        });

        it('should init htmlReporter instance with parsed reporter config', async () => {
            const reporterConfig = {path: 'some/path'} as ReporterConfig;
            parseConfigStub.returns(reporterConfig);

            await createPwtToolAdapter({toolName: ToolName.Playwright, configPath: './pwt.config.ts'});

            assert.calledOnceWith(HtmlReporter.create as SinonStub, reporterConfig, {toolName: ToolName.Playwright});
        });

        it('should find pwt binary file', async () => {
            await createPwtToolAdapter({toolName: ToolName.Playwright, configPath: './pwt.config.ts'});

            (npmWhich.sync as SinonStub).calledOnceWith(ToolName.Playwright, {cwd: process.cwd()});
        });
    });

    describe('readTests', () => {
        const pwtBinaryPath = '/node_modules/.bin/playwright';
        const configPath = './default-pwt.config.ts';
        let spawnProc: ChildProcessWithoutNullStreams;

        const readTests_ = async (config: FullConfig = {} as FullConfig): Promise<PlaywrightTestCollectionAdapter> => {
            const toolAdapter = await createPwtToolAdapter({toolName: ToolName.Playwright, configPath}, config);

            return toolAdapter.readTests();
        };

        beforeEach(() => {
            (npmWhich.sync as SinonStub).withArgs(ToolName.Playwright, {cwd: process.cwd()}).returns(pwtBinaryPath);

            spawnProc = mkSpawnInstance_();
            (childProcess.spawn as SinonStub).returns(spawnProc);
        });

        describe('should run pwt binary with correct arguments', () => {
            it('if "projects" field is specified', async () => {
                const config = {
                    projects: [
                        {name: 'chrome'}
                    ]
                } as unknown as FullConfig;

                P.delay(10).then(() => spawnProc.emit('exit', 0));
                await readTests_(config);

                assert.calledOnceWith(childProcess.spawn as SinonStub, pwtBinaryPath, ['test', '--list', '--reporter', 'list', '--config', path.resolve(configPath)]);
            });

            it('if "projects" field is not specified', async () => {
                const config = {} as unknown as FullConfig;

                P.delay(10).then(() => spawnProc.emit('exit', 0));
                await readTests_(config);

                assert.calledOnceWith(
                    childProcess.spawn as SinonStub,
                    pwtBinaryPath,
                    ['test', '--list', '--reporter', 'list', '--config', path.resolve(configPath), '--browser', DEFAULT_BROWSER_ID]);
            });
        });

        it('should create test collection with empty tests if process did not write anything to stdout', async () => {
            P.delay(10).then(() => spawnProc.emit('exit', 0));
            await readTests_();

            assert.calledOnceWith(PlaywrightTestCollectionAdapter.create as SinonStub, []);
        });

        it('should create test collection with read tests if process did not write anything to stdout', async () => {
            const browserName = 'yabro';
            const file = 'example.spec.ts';

            P.delay(10).then(() => {
                spawnProc.stdout.emit('data', 'Listing tests:\n');
                spawnProc.stdout.emit('data', `  [${browserName}] › ${file}:4:5 › suite › test #1\n`);
                spawnProc.stdout.emit('data', `  [${browserName}] › ${file}:16:5 › suite › test #2\n`);
                spawnProc.stdout.emit('data', 'Total: 2 tests in 1 file');

                spawnProc.emit('exit', 0);
            });
            await readTests_();

            assert.calledOnceWith(PlaywrightTestCollectionAdapter.create as SinonStub, [
                {
                    browserName,
                    file,
                    title: 'suite test #1',
                    titlePath: ['suite', 'test #1']
                },
                {
                    browserName,
                    file,
                    title: 'suite test #2',
                    titlePath: ['suite', 'test #2']
                }
            ]);
        });

        it('should return test collection adapter', async () => {
            const testCollectionAdapter = {};
            (PlaywrightTestCollectionAdapter.create as SinonStub).withArgs([]).returns(testCollectionAdapter);

            P.delay(10).then(() => spawnProc.emit('exit', 0));
            const res = await readTests_();

            assert.deepEqual(res, testCollectionAdapter);
        });

        it('should throw error if read tests process emit "error" event', async () => {
            const error = new Error('o.O');

            P.delay(10).then(() => spawnProc.emit('error', error));

            await assert.isRejected(
                readTests_(),
                error
            );
        });

        it('should throw error if process exited with code greater than zero', async () => {
            const stderr = 'o.O';
            const code = 1;

            P.delay(10).then(() => {
                spawnProc.stderr.emit('data', stderr);
                spawnProc.emit('exit', code);
            });

            await assert.isRejected(
                readTests_(),
                `Playwright process with reading tests exited with code: ${code}, stderr: ${stderr}`
            );
        });
    });

    describe('run', () => {
        const pwtBinaryPath = '/node_modules/.bin/playwright';
        const configPath = './default-pwt.config.ts';
        let spawnProc: ChildProcessWithoutNullStreams;
        let eventSource: EventSource;

        const run_ = async (opts: {tests?: TestSpec[], config?: FullConfig, reportBuilder?: GuiReportBuilder} = {}): Promise<boolean> => {
            const {tests = [], config = {} as FullConfig, reportBuilder = mkReportBuilder_()} = opts;
            const toolAdapter = await createPwtToolAdapter({toolName: ToolName.Playwright, configPath}, config);

            toolAdapter.handleTestResults(reportBuilder, eventSource);

            return toolAdapter.run(PlaywrightTestCollectionAdapter.create([]), tests);
        };

        beforeEach(() => {
            (npmWhich.sync as SinonStub).withArgs(ToolName.Playwright, {cwd: process.cwd()}).returns(pwtBinaryPath);

            eventSource = {emit: sinon.stub()} as unknown as EventSource;

            spawnProc = mkSpawnInstance_();
            (childProcess.spawn as SinonStub).returns(spawnProc);
        });

        it('should throw if "reportBuilder" and "eventSource" instances are not specified', async () => {
            const toolAdapter = await createPwtToolAdapter({toolName: ToolName.Playwright, configPath});

            await assert.isRejected(
                toolAdapter.run(PlaywrightTestCollectionAdapter.create([]), []),
                '"reportBuilder" and "eventSource" instances must be initialize before run tests'
            );
        });

        describe('should run pwt binary with correct arguments', () => {
            it('if "projects" field is specified in config, but tests not passed', async () => {
                const config = {
                    projects: [
                        {name: 'chrome'}
                    ]
                } as unknown as FullConfig;

                P.delay(10).then(() => spawnProc.emit('exit', 0));
                await run_({config});

                assert.calledOnceWith(
                    childProcess.spawn as SinonStub,
                    pwtBinaryPath,
                    [
                        'test',
                        '--reporter', path.resolve('./lib/adapters/tool/playwright/reporter'),
                        '--config', path.resolve(configPath)
                    ],
                    {
                        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
                    }
                );
            });

            it('if "projects" field is specified in config and tests passed', async () => {
                const config = {
                    projects: [
                        {name: 'chrome'},
                        {name: 'firefox'}
                    ]
                } as unknown as FullConfig;
                const tests = [
                    {testName: 'foo', browserName: 'chrome'},
                    {testName: 'bar', browserName: 'firefox'}
                ];

                P.delay(10).then(() => spawnProc.emit('exit', 0));
                await run_({tests, config});

                assert.calledOnceWith(
                    childProcess.spawn as SinonStub,
                    pwtBinaryPath,
                    [
                        'test',
                        '--reporter', path.resolve('./lib/adapters/tool/playwright/reporter'),
                        '--config', path.resolve(configPath),
                        '--grep', 'foo|bar',
                        '--project', 'chrome',
                        '--project', 'firefox'
                    ],
                    {
                        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
                    }
                );
            });

            it('if "projects" field not specified in config and tests not passed', async () => {
                P.delay(10).then(() => spawnProc.emit('exit', 0));
                await run_();

                assert.calledOnceWith(
                    childProcess.spawn as SinonStub,
                    pwtBinaryPath,
                    [
                        'test',
                        '--reporter', path.resolve('./lib/adapters/tool/playwright/reporter'),
                        '--config', path.resolve(configPath),
                        '--browser', DEFAULT_BROWSER_ID
                    ],
                    {
                        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
                    }
                );
            });

            it('if "projects" field not specified in config, but tests passed', async () => {
                const tests = [
                    {testName: 'foo', browserName: DEFAULT_BROWSER_ID}
                ];

                P.delay(10).then(() => spawnProc.emit('exit', 0));
                await run_({tests});

                assert.calledOnceWith(
                    childProcess.spawn as SinonStub,
                    pwtBinaryPath,
                    [
                        'test',
                        '--reporter', path.resolve('./lib/adapters/tool/playwright/reporter'),
                        '--config', path.resolve(configPath),
                        '--grep', 'foo',
                        '--browser', DEFAULT_BROWSER_ID
                    ],
                    {
                        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
                    }
                );
            });
        });

        it('should escape special characters in "grep" option', async () => {
            const tests = [
                {testName: '(a) [b] {c} -d\\', browserName: DEFAULT_BROWSER_ID},
                {testName: '|e* +f? .g, ^h$ *', browserName: DEFAULT_BROWSER_ID}
            ];

            P.delay(10).then(() => spawnProc.emit('exit', 0));
            await run_({tests});

            assert.calledOnceWith(
                childProcess.spawn as SinonStub,
                pwtBinaryPath,
                sinon.match.array.contains([
                    '--grep', '\\(a\\) \\[b\\] \\{c\\} \\-d\\\\|\\|e\\* \\+f\\? \\.g\\, \\^h\\$ \\*'
                ])
            );
        });

        ([ClientEvents.BEGIN_STATE, ClientEvents.TEST_RESULT] as const).forEach((eventName) => {
            describe(`"${eventName}" event`, () => {
                it('should create test result adapter', async () => {
                    const timestamp = Date.now();

                    P.delay(10).then(() => {
                        ipcStub.emit(eventName, {
                            test: {
                                foo: 1,
                                parent: {
                                    baz: 2
                                }
                            },
                            result: {
                                baz: 3,
                                startTime: timestamp
                            },
                            browserName: 'yabro',
                            titlePath: ['suite', 'test'],
                            event: eventName
                        });
                        spawnProc.emit('exit', 0);
                    });
                    await run_();

                    const testCase = (PlaywrightTestResultAdapter.create as SinonStub).lastCall.args[0];

                    assert.calledOnceWith(
                        PlaywrightTestResultAdapter.create as SinonStub,
                        {
                            foo: 1,
                            parent: {
                                baz: 2,
                                project: sinon.match.func
                            },
                            titlePath: sinon.match.func
                        },
                        {
                            baz: 3,
                            startTime: new Date(timestamp),
                            ...(eventName === ClientEvents.BEGIN_STATE ? {status: TestStatus.RUNNING} : {})
                        },
                        UNKNOWN_ATTEMPT
                    );
                    assert.deepEqual(testCase.titlePath(), ['suite', 'test']);
                    assert.deepEqual(testCase.parent.project(), {name: 'yabro'});
                });

                it('should add test result to report builder', async () => {
                    const reportBuilder = mkReportBuilder_();
                    const testResultAdapter = {};
                    (PlaywrightTestResultAdapter.create as SinonStub).returns(testResultAdapter);

                    P.delay(10).then(() => {
                        ipcStub.emit(eventName, {
                            test: {}, result: {}, browserName: '', titlePath: [], event: eventName
                        });
                        spawnProc.emit('exit', 0);
                    });
                    await run_({reportBuilder});

                    assert.calledOnceWith(reportBuilder.addTestResult as SinonStub, testResultAdapter);
                });

                it('should emit event for client with correct data', async () => {
                    const reportBuilder = mkReportBuilder_();
                    const testBranch = {};
                    (reportBuilder.addTestResult as SinonStub).resolves({id: 'foo'});
                    (reportBuilder.getTestBranch as SinonStub).withArgs('foo').returns(testBranch);

                    P.delay(10).then(() => {
                        ipcStub.emit(eventName, {
                            test: {}, result: {}, browserName: '', titlePath: [], event: eventName
                        });
                        spawnProc.emit('exit', 0);
                    });
                    await run_({reportBuilder});

                    assert.calledOnceWith(eventSource.emit as SinonStub, eventName, testBranch);
                });
            });
        });

        describe(`"${ClientEvents.END}" event`, () => {
            it('should emit event for client with correct data', async () => {
                const reportBuilder = mkReportBuilder_();

                P.delay(10).then(() => {
                    ipcStub.emit(ClientEvents.END, {event: ClientEvents.END});
                    spawnProc.emit('exit', 0);
                });
                await run_({reportBuilder});

                assert.calledOnceWith(eventSource.emit as SinonStub, ClientEvents.END);
            });
        });

        it('should throw error if run tests process emit "error" event', async () => {
            const error = new Error('o.O');

            P.delay(10).then(() => spawnProc.emit('error', error));

            await assert.isRejected(
                run_(),
                error
            );
        });

        describe('should resolve run tests with', () => {
            it('"true" if exit code = 0', async () => {
                const code = 0;

                P.delay(10).then(() => spawnProc.emit('exit', code));
                const result = await run_();

                assert.isTrue(result);
            });

            it('"false" if exit code != 0', async () => {
                const code = 123;

                P.delay(10).then(() => spawnProc.emit('exit', code));
                const result = await run_();

                assert.isFalse(result);
            });
        });
    });

    describe('runWithoutRetries', () => {
        const pwtBinaryPath = '/node_modules/.bin/playwright';
        const configPath = './default-pwt.config.ts';
        let spawnProc: ChildProcessWithoutNullStreams;
        let eventSource: EventSource;

        beforeEach(() => {
            (npmWhich.sync as SinonStub).withArgs(ToolName.Playwright, {cwd: process.cwd()}).returns(pwtBinaryPath);

            eventSource = {emit: sinon.stub()} as unknown as EventSource;

            spawnProc = mkSpawnInstance_();
            (childProcess.spawn as SinonStub).returns(spawnProc);
        });

        it('should run pwt binary with disabled retries', async () => {
            const config = {
                projects: [{name: 'yabro'}]
            } as unknown as FullConfig;
            const tests = [
                {testName: 'foo', browserName: 'yabro'}
            ];

            const toolAdapter = await createPwtToolAdapter({toolName: ToolName.Playwright, configPath}, config);
            toolAdapter.handleTestResults(mkReportBuilder_(), eventSource);

            P.delay(10).then(() => spawnProc.emit('exit', 0));
            await toolAdapter.runWithoutRetries(PlaywrightTestCollectionAdapter.create([]), tests);

            assert.calledOnceWith(
                childProcess.spawn as SinonStub,
                pwtBinaryPath,
                [
                    'test',
                    '--reporter', path.resolve('./lib/adapters/tool/playwright/reporter'),
                    '--config', path.resolve(configPath),
                    '--grep', 'foo',
                    '--project', 'yabro',
                    '--retries', '0'
                ],
                {
                    stdio: ['inherit', 'inherit', 'inherit', 'ipc']
                }
            );
        });
    });
});
