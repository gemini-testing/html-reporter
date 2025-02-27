import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';

import npmWhich from 'npm-which';
import PQueue from 'p-queue';
import _ from 'lodash';

import {PlaywrightConfigAdapter, DEFAULT_BROWSER_ID} from '../../config/playwright';
import {PlaywrightTestCollectionAdapter} from '../../test-collection/playwright';
import {parseConfig} from '../../../config';
import {HtmlReporter} from '../../../plugin-api';
import {setupTransformHook} from './transformer';
import {
    ToolName,
    UNKNOWN_ATTEMPT,
    PWT_TITLE_DELIMITER,
    DEFAULT_TITLE_DELIMITER,
    TestStatus,
    BrowserFeature
} from '../../../constants';
import {ClientEvents} from '../../../gui/constants';
import {GuiApi} from '../../../gui/api';
import {PlaywrightTestResultAdapter} from '../../test-result/playwright';
import ipc from './ipc';
import pkg from '../../../../package.json';
import {logger} from '../../../common-utils';

import {ToolAdapter, ToolAdapterOptionsFromCli} from '../index';
import type {GuiReportBuilder} from '../../../report-builder/gui';
import type {EventSource} from '../../../gui/event-source';
import type {PwtRawTest} from '../../test/playwright';
import type {ReporterConfig} from '../../../types';
import type {TestSpec} from '../types';
import type {FullConfig, TestCase, TestResult} from '@playwright/test/reporter';
import type {TestBranch} from '../../../tests-tree-builder/gui';
import type {PwtEventMessage} from './reporter';

export const DEFAULT_CONFIG_PATHS = [
    `${ToolName.Playwright}.config.ts`,
    `${ToolName.Playwright}.config.js`,
    `${ToolName.Playwright}.config.mts`,
    `${ToolName.Playwright}.config.mjs`,
    `${ToolName.Playwright}.config.cts`,
    `${ToolName.Playwright}.config.cjs`
];

export class PlaywrightToolAdapter implements ToolAdapter {
    private _toolName: ToolName;
    private _configPath: string;
    private _config: PlaywrightConfigAdapter;
    private _reporterConfig: ReporterConfig;
    private _hasProjectsInConfig: boolean;
    private _htmlReporter: HtmlReporter;
    private _pwtBinaryPath: string;
    private _reportBuilder!: GuiReportBuilder;
    private _eventSource!: EventSource;
    private _guiApi?: GuiApi;

    static create(
        this: new (options: ToolAdapterOptionsFromCli) => PlaywrightToolAdapter,
        options: ToolAdapterOptionsFromCli
    ): PlaywrightToolAdapter {
        return new this(options);
    }

    constructor(opts: ToolAdapterOptionsFromCli) {
        const {config, configPath} = readPwtConfig(opts);

        this._configPath = configPath;
        this._config = PlaywrightConfigAdapter.create(config);
        this._toolName = opts.toolName;

        const pluginOpts = getPluginOptions(this._config.original);
        this._reporterConfig = parseConfig(pluginOpts);

        this._hasProjectsInConfig = !_.isEmpty(this._config.original.projects);

        this._htmlReporter = HtmlReporter.create(this._reporterConfig, {toolName: ToolName.Playwright});
        this._pwtBinaryPath = npmWhich.sync(ToolName.Playwright, {cwd: process.cwd()});
    }

    get configPath(): string {
        return this._configPath;
    }

    get toolName(): ToolName {
        return this._toolName;
    }

    get config(): PlaywrightConfigAdapter {
        return this._config;
    }

    get reporterConfig(): ReporterConfig {
        return this._reporterConfig;
    }

    get htmlReporter(): HtmlReporter {
        return this._htmlReporter;
    }

    get guiApi(): GuiApi | undefined {
        return this._guiApi;
    }

    get browserFeatures(): Record<string, BrowserFeature[]> {
        return {};
    }

    initGuiApi(): void {
        this._guiApi = GuiApi.create();
    }

    async readTests(): Promise<PlaywrightTestCollectionAdapter> {
        const stdout = await new Promise<string>((resolve, reject) => {
            // specify default browser in order to get correct stdout with browser name
            const browserArgs = this._hasProjectsInConfig ? [] : ['--browser', DEFAULT_BROWSER_ID];

            const child = spawn(this._pwtBinaryPath, ['test', '--list', '--reporter', 'list', '--config', this._configPath, ...browserArgs]);
            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => stdout += data);
            child.stderr.on('data', (data) => stderr += data);

            child.on('error', (error) => reject(error));

            child.on('exit', (code) => {
                if (code !== 0) {
                    return reject(new Error(`Playwright process with reading tests exited with code: ${code}, stderr: ${stderr}`));
                }

                resolve(stdout);
            });
        });

        const stdoutByLine = stdout.split('\n').map(v => v.trim());
        const startIndex = stdoutByLine.findIndex(v => v === 'Listing tests:');
        const endIndex = stdoutByLine.findIndex(v => /total: \d+ tests? in \d+ file/i.test(v));

        const tests = stdoutByLine.slice(startIndex + 1, endIndex).map(line => {
            const [browserName, file, ...titlePath] = line.split(PWT_TITLE_DELIMITER);

            return {
                browserName: browserName.slice(1, -1),
                file: file.split(':')[0],
                title: titlePath.join(DEFAULT_TITLE_DELIMITER),
                titlePath
            } as PwtRawTest;
        });

        return PlaywrightTestCollectionAdapter.create(tests);
    }

    async run(_testCollection: PlaywrightTestCollectionAdapter, tests: TestSpec[] = []): Promise<boolean> {
        return this._runTests(tests);
    }

    async runWithoutRetries(_testCollection: PlaywrightTestCollectionAdapter, tests: TestSpec[] = []): Promise<boolean> {
        return this._runTests(tests, ['--retries', '0']);
    }

    private async _runTests(tests: TestSpec[] = [], runArgs: string[] = []): Promise<boolean> {
        if (!this._reportBuilder || !this._eventSource) {
            throw new Error('"reportBuilder" and "eventSource" instances must be initialize before run tests');
        }

        const queue = new PQueue({concurrency: os.cpus().length});

        return new Promise((resolve, reject) => {
            const args = ([] as string[]).concat(prepareRunArgs(tests, this._configPath, this._hasProjectsInConfig), runArgs);
            const child = spawn(this._pwtBinaryPath, args, {
                stdio: ['inherit', 'inherit', 'inherit', 'ipc']
            });

            ipc.on<PwtEventMessage>(ClientEvents.BEGIN_STATE, (data) => {
                data.result.status = TestStatus.RUNNING;

                queue.add(async () => {
                    const testBranch = await registerTestResult(data, this._reportBuilder);

                    this._eventSource.emit(data.event, testBranch);
                }).catch(reject);
            }, child);

            ipc.on<PwtEventMessage>(ClientEvents.TEST_RESULT, (data) => {
                queue.add(async () => {
                    const testBranch = await registerTestResult(data, this._reportBuilder);

                    this._eventSource.emit(data.event, testBranch);
                }).catch(reject);
            }, child);

            ipc.on(ClientEvents.END, (data) => {
                queue.onIdle().then(() => this._eventSource.emit(data.event));
            }, child);

            child.on('error', (data) => reject(data));

            child.on('exit', (code) => {
                queue.onIdle().then(() => resolve(!code));
            });
        });
    }

    // Can't handle test results here because pwt does not provide api for this, so save instances and use them in custom reporter
    handleTestResults(reportBuilder: GuiReportBuilder, eventSource: EventSource): void {
        this._reportBuilder = reportBuilder;
        this._eventSource = eventSource;
    }

    updateReference(): void {}

    halt(err: Error): void {
        logger.error(err);
        process.exit(1);
    }
}

function readPwtConfig(opts: ToolAdapterOptionsFromCli): {configPath: string, config: FullConfig} {
    const configPaths = opts.configPath ? [opts.configPath] : DEFAULT_CONFIG_PATHS;
    let originalConfig!: FullConfig;
    let resolvedConfigPath!: string;

    const revertTransformHook = setupTransformHook();

    for (const configPath of configPaths) {
        try {
            resolvedConfigPath = path.resolve(configPath);
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const configModule = require(resolvedConfigPath);
            originalConfig = configModule.__esModule ? configModule.default : configModule;

            break;
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') {
                throw err;
            }
        }
    }

    revertTransformHook();

    if (!originalConfig) {
        throw new Error(`Unable to read config from paths: ${configPaths.join(', ')}`);
    }

    return {config: originalConfig, configPath: resolvedConfigPath};
}

async function registerTestResult(eventMsg: PwtEventMessage, reportBuilder: GuiReportBuilder): Promise<TestBranch> {
    const {test, result, browserName, titlePath} = eventMsg;

    const testCase = {
        ...test,
        titlePath: () => titlePath,
        parent: {
            ...test.parent,
            project: () => ({
                name: browserName
            })
        }
    } as TestCase;

    const testResult = {
        ...result,
        startTime: new Date(result.startTime)
    } as TestResult;

    const formattedResultWithoutAttempt = PlaywrightTestResultAdapter.create(testCase, testResult, UNKNOWN_ATTEMPT);
    const formattedResult = await reportBuilder.addTestResult(formattedResultWithoutAttempt);

    return reportBuilder.getTestBranch(formattedResult.id);
}

function prepareRunArgs(tests: TestSpec[], configPath: string, hasProjectsInConfig: boolean): string[] {
    const testNames = new Set<string>();
    const browserNames = new Set<string>();

    for (const {testName, browserName} of tests) {
        testNames.add(testName);
        browserNames.add(browserName);
    }

    const args = ['test', '--reporter', path.resolve(__dirname, './reporter'), '--config', configPath];

    if (testNames.size > 0) {
        args.push('--grep', Array.from(testNames).map(escapeRegExp).join('|'));
    }

    if (browserNames.size > 0) {
        const projectArgs = Array.from(browserNames).flatMap(broName => [hasProjectsInConfig ? '--project' : '--browser', broName]);
        args.push(...projectArgs);
    } else if (!hasProjectsInConfig) {
        args.push(...['--browser', DEFAULT_BROWSER_ID]);
    }

    return args;
}

function getPluginOptions(config: PlaywrightConfigAdapter['original']): Partial<ReporterConfig> {
    const {reporter: reporters} = config;

    if (!_.isArray(reporters)) {
        return {};
    }

    for (const reporter of reporters) {
        if (_.isString(reporter)) {
            continue;
        }

        const [reporterName, reporterOpts = {}] = reporter;

        if (reporterName === `${pkg.name}/${ToolName.Playwright}`) {
            return reporterOpts;
        }
    }

    return {};
}

function escapeRegExp(text: string): string {
    return text.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&');
}
