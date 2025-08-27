import _ from 'lodash';
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

import {ToolAdapter, ToolAdapterOptionsFromCli, UpdateReferenceOpts} from '../index';
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

export class TestplaneToolAdapter implements ToolAdapter {
    private _toolName: ToolName;
    private _tool: TestplaneWithHtmlReporter;
    private _config: TestplaneConfigAdapter;
    private _reporterConfig: ReporterConfig;
    private _htmlReporter: HtmlReporter;
    private _guiApi?: GuiApi;
    private _browserConfigs: ReturnType<Config['forBrowser']>[];
    private _retryCache: Record<string, number>;

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

    initGuiApi(): void {
        this._guiApi = GuiApi.create();

        // in order to be able to use it from other plugins as an API
        this._tool.gui = this._guiApi.gui;
    }

    async readTests(paths: string[], cliTool: CommanderStatic): Promise<TestplaneTestCollectionAdapter> {
        const {TestplaneTestCollectionAdapter} = await import('../../test-collection/testplane');
        const {grep, set: sets, browser: browsers} = cliTool;
        const replMode = getReplModeOption(cliTool);

        const testCollection = await this._tool.readTests(paths, {grep, sets, browsers, replMode});

        return TestplaneTestCollectionAdapter.create(testCollection, this._tool.config.saveHistoryMode);
    }

    async run(testCollectionAdapter: TestplaneTestCollectionAdapter, tests: TestSpec[] = [], cliTool: CommanderStatic): Promise<boolean> {
        const {grep, set: sets, browser: browsers, devtools = false, local = false} = cliTool;
        const replMode = getReplModeOption(cliTool);
        const runner = createTestRunner(testCollectionAdapter.original, tests);

        return runner.run((collection) => this._tool.run(collection, {grep, sets, browsers, devtools, replMode, local}));
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
