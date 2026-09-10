import _ from 'lodash';
import fs from 'node:fs';
import path from 'node:path';
import type Testplane from 'testplane';
import type {Config} from 'testplane';
import type {CommanderStatic} from '@gemini-testing/commander';

import type {TestplaneTestCollectionAdapter} from '../../test-collection/testplane';
import {TestplaneConfigAdapter} from '../../config/testplane';
import {GuiApi} from '../../../gui/api';
import {parseConfig} from '../../../config';
import {HtmlReporter} from '../../../plugin-api';
import {ApiFacade} from '../../../gui/api/facade';
import {createTestRunner} from './runner';
import {EventSource} from '../../../gui/event-source';
import {GuiReportBuilder} from '../../../report-builder/gui';
import {handleTestResults} from './test-results-handler';
import {BrowserFeature, ToolName} from '../../../constants';

import {TestsWatchPlan, ToolAdapter, ToolAdapterOptionsFromCli, UpdateReferenceOpts} from '../index';
import type {CustomGuiActionPayload, TestSpec} from '../types';
import type {CustomGuiItem, ReporterConfig} from '../../../types';
import type {ConfigAdapter} from '../../config/index';
import {getTimeTravelModeEnumSafe} from '../../../server-utils';

type HtmlReporterApi = {
    gui: ApiFacade;
    htmlReporter: HtmlReporter;
};
export type TestplaneWithHtmlReporter = Testplane & HtmlReporterApi;

interface ReplModeOption {
    enabled: boolean;
    beforeTest: boolean;
    onFail: boolean;
}

interface OptionsFromPlugin {
    toolName: ToolName.Testplane;
    tool: Testplane;
    reporterConfig: ReporterConfig;
}

type RunTestArgs = [TestplaneTestCollectionAdapter, TestSpec[], CommanderStatic];

type Options = ToolAdapterOptionsFromCli | OptionsFromPlugin;

const SUPPORTED_TOOLS = [ToolName.Testplane, 'hermione'];
const DEFAULT_TEST_PATHS = ['testplane', 'hermione'];
const MOCHA_TEST_METHODS = ['describe', 'context', 'it', 'specify', 'suite', 'test'];

type MochaMethod = ((...args: unknown[]) => unknown) & {
    only?: (...args: unknown[]) => unknown;
};

const getEnvSets = (): string[] => {
    const value = process.env.TESTPLANE_SETS || process.env.HERMIONE_SETS;

    return value ? value.split(/, */) : [];
};

const getWatchRoot = (pattern: string): string => {
    const normalizedPattern = pattern.replaceAll('\\', '/');
    const globStart = normalizedPattern.search(/[!*?()[\]{}]/);

    if (globStart !== -1) {
        const staticPart = normalizedPattern.slice(0, globStart);

        return staticPart.endsWith('/') ? staticPart.slice(0, -1) : path.dirname(staticPart);
    }

    const normalizedPath = normalizedPattern.replace(/\/$/, '');

    try {
        return fs.statSync(normalizedPath).isDirectory() ? normalizedPath : path.dirname(normalizedPath);
    } catch {
        return path.extname(normalizedPath) ? path.dirname(normalizedPath) : normalizedPath;
    }
};

export class TestplaneToolAdapter implements ToolAdapter {
    private _toolName: ToolName;
    private _tool: TestplaneWithHtmlReporter;
    private _config: TestplaneConfigAdapter;
    private _reporterConfig: ReporterConfig;
    private _htmlReporter: HtmlReporter;
    private _guiApi?: GuiApi;
    private _browserConfigs: ReturnType<Config['forBrowser']>[];
    private _retryCache: Record<string, number>;
    private _hasFocusedTestsInLastRead: boolean;

    static create<TestplaneToolAdapter>(
        this: new (options: Options) => TestplaneToolAdapter,
        options: Options
    ): TestplaneToolAdapter {
        return new this(options);
    }

    constructor(opts: Options) {
        if ('tool' in opts) {
            this._tool = opts.tool as TestplaneWithHtmlReporter;
            this._reporterConfig = opts.reporterConfig;
        } else {
            // in order to not use static report with gui simultaneously
            process.env['html_reporter_enabled'] = false.toString();
            this._tool = createTool(opts.configPath);

            const pluginOpts = getPluginOptions(this._tool.config);
            this._reporterConfig = parseConfig(pluginOpts);
        }

        this._toolName = opts.toolName;
        this._config = TestplaneConfigAdapter.create(this._tool.config);
        this._browserConfigs = _.map(this._config.browserIds, (id) => this._config.getBrowserConfig(id));
        this._htmlReporter = HtmlReporter.create(this._reporterConfig, {toolName: ToolName.Testplane});

        this._retryCache = {};
        this._hasFocusedTestsInLastRead = false;

        // in order to be able to use it from other plugins as an API
        this._tool.htmlReporter = this._htmlReporter;
    }

    get toolName(): ToolName {
        return this._toolName;
    }

    get config(): ConfigAdapter {
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
        const result: Record<string, BrowserFeature[]> = {};

        for (const browserConfig of this._browserConfigs) {
            const features: BrowserFeature[] = [];

            const TimeTravelMode = getTimeTravelModeEnumSafe();
            if (TimeTravelMode && browserConfig.timeTravel && browserConfig.timeTravel.mode === TimeTravelMode.On) {
                features.push(BrowserFeature.LiveSnapshotsStreaming);
            }

            result[browserConfig.id] = features;
        }

        return result;
    }

    get hasFocusedTestsInLastRead(): boolean {
        return this._hasFocusedTestsInLastRead;
    }

    initGuiApi(): void {
        this._guiApi = GuiApi.create();

        // in order to be able to use it from other plugins as an API
        this._tool.gui = this._guiApi.gui;
    }

    getTestsWatchPlan(paths: string[], cliTool: CommanderStatic): TestsWatchPlan {
        const selectedSets = ([] as string[]).concat(cliTool.set || [], getEnvSets());
        const configuredSets = selectedSets.length
            ? _.pick(this._tool.config.sets, selectedSets)
            : this._tool.config.sets;
        const configuredPaths = Object.values(configuredSets).flatMap(({files}) => files);
        const watchPaths = _.uniq(paths.length ? paths : configuredPaths.length ? configuredPaths : DEFAULT_TEST_PATHS);

        return {
            paths: watchPaths,
            roots: _.uniq(watchPaths.map(getWatchRoot).filter(Boolean))
        };
    }

    async readTests(paths: string[], cliTool: CommanderStatic): Promise<TestplaneTestCollectionAdapter> {
        const {TestplaneTestCollectionAdapter} = await import('../../test-collection/testplane');
        const {grep, tag, set: sets, browser: browsers} = cliTool;
        const replMode = getReplModeOption(cliTool);
        this._hasFocusedTestsInLastRead = false;
        const wrappedOnlyMethods: Array<{method: MochaMethod; original: MochaMethod['only']; wrapped: MochaMethod['only']}> = [];
        const wrappedMethods = new Set<MochaMethod>();
        const setFocusedTests = (): void => {
            this._hasFocusedTestsInLastRead = true;
        };
        const markFocusedTests = (): void => {
            const mochaGlobals = globalThis as typeof globalThis & Record<string, MochaMethod | undefined>;

            for (const methodName of MOCHA_TEST_METHODS) {
                const method = mochaGlobals[methodName];
                const original = method?.only;

                if (!method || !original || wrappedMethods.has(method)) {
                    continue;
                }

                const wrapped = function(this: unknown, ...args: unknown[]): unknown {
                    setFocusedTests();

                    return original.apply(this, args);
                };

                method.only = wrapped;
                wrappedMethods.add(method);
                wrappedOnlyMethods.push({method, original, wrapped});
            }
        };

        this._tool.on('beforeFileRead', markFocusedTests);

        try {
            const testCollection = await this._tool.readTests(paths, {grep, sets, tag, browsers, replMode});

            return TestplaneTestCollectionAdapter.create(testCollection, this._tool.config.saveHistoryMode, this._hasFocusedTestsInLastRead);
        } finally {
            this._tool.removeListener('beforeFileRead', markFocusedTests);
            for (const {method, original, wrapped} of wrappedOnlyMethods) {
                if (method.only === wrapped) {
                    method.only = original;
                }
            }
        }
    }

    async run(testCollectionAdapter: TestplaneTestCollectionAdapter, tests: TestSpec[] = [], cliTool: CommanderStatic): Promise<boolean> {
        const {
            grep,
            tag,
            set: sets,
            browser: browsers,
            inspect,
            inspectBrk,
            devtools = false,
            local = false,
            require: requireModules = []
        } = cliTool;
        const replMode = getReplModeOption(cliTool);
        const runner = createTestRunner(testCollectionAdapter.original, tests);
        const inspectMode = (inspect || inspectBrk) && {inspect, inspectBrk};

        return runner.run((collection) =>
            this._tool.run(collection, {grep, sets, tag, browsers, inspectMode, devtools, replMode, local, requireModules})
        );
    }

    async runWithoutRetries(...args: RunTestArgs): Promise<boolean> {
        this._disableRetries();

        return this.run(...args)
            .finally(() => this._restoreRetries());
    }

    updateReference(opts: UpdateReferenceOpts): void {
        this._tool.emit(this._tool.events.UPDATE_REFERENCE, opts);
    }

    handleTestResults(reportBuilder: GuiReportBuilder, eventSource: EventSource): void {
        handleTestResults(this._tool, reportBuilder, eventSource);
    }

    halt(err: Error, timeout: number): void {
        this._tool.halt(err, timeout);
    }

    async initGuiHandler(): Promise<void> {
        const {customGui} = this._reporterConfig;

        await Promise.all(
            _(customGui)
                .flatMap<CustomGuiItem>(_.identity)
                .map((ctx) => ctx.initialize?.({testplane: this._tool, hermione: this._tool, ctx}))
                .value()
        );
    }

    async runCustomGuiAction(payload: CustomGuiActionPayload): Promise<void> {
        const {customGui} = this._reporterConfig;

        const {sectionName, groupIndex, controlIndex} = payload;
        const ctx = customGui[sectionName][groupIndex];
        const control = ctx.controls[controlIndex];

        await ctx.action({testplane: this._tool, hermione: this._tool, control, ctx});
    }

    private _disableRetries(): void {
        this._browserConfigs.forEach((broConfig) => {
            this._retryCache[broConfig.id] = broConfig.retry;
            broConfig.retry = 0;
        });
    }

    private _restoreRetries(): void {
        this._browserConfigs.forEach((broConfig) => {
            broConfig.retry = this._retryCache[broConfig.id];
        });
    }
}

function getPluginOptions(config: Config): Partial<ReporterConfig> {
    const defaultOpts = {};

    for (const toolName of SUPPORTED_TOOLS) {
        const opts = _.get(config.plugins, `html-reporter/${toolName}`, defaultOpts);

        if (!_.isEmpty(opts)) {
            return opts;
        }
    }

    return defaultOpts;
}

function createTool(configPath?: string): TestplaneWithHtmlReporter {
    let tool!: TestplaneWithHtmlReporter;

    for (const toolName of SUPPORTED_TOOLS) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const Tool = require(toolName).default;
            tool = Tool.create(configPath) as TestplaneWithHtmlReporter;

            break;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            if (err.code !== 'MODULE_NOT_FOUND') {
                throw err;
            }
        }
    }

    if (!tool) {
        throw new Error(`Cannot find any of these modules: ${SUPPORTED_TOOLS.join(', ')}`);
    }

    return tool;
}

function getReplModeOption(cliTool: CommanderStatic): ReplModeOption {
    const {repl = false, replBeforeTest = false, replOnFail = false} = cliTool;

    return {
        enabled: repl || replBeforeTest || replOnFail,
        beforeTest: replBeforeTest,
        onFail: replOnFail
    };
}
