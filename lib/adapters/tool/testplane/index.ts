import _ from 'lodash';
import Testplane, {type Config} from 'testplane';
import type {CommanderStatic} from '@gemini-testing/commander';

import {BaseToolAdapter, type BaseToolAdapterOptions, type UpdateReferenceOpts} from '../base';
import {TestplaneTestCollectionAdapter} from '../../test-collection/testplane';
import {TestplaneConfigAdapter} from '../../config/testplane';
import {parseConfig} from '../../../config';
import {HtmlReporter} from '../../../plugin-api';
import {ApiFacade} from '../../../gui/api/facade';
import {createTestRunner} from './runner';
import {EventSource} from '../../../gui/event-source';
import {GuiReportBuilder} from '../../../report-builder/gui';
import {handleTestResults} from './test-results-handler';
import {ToolName} from '../../../constants';

import type {TestSpec, CustomGuiActionPayload} from '../types';
import type {ReporterConfig, CustomGuiItem} from '../../../types';
import type {ConfigAdapter} from '../../config/index';

type TestplaneEnhanced = Testplane & { gui: ApiFacade, htmlReporter: HtmlReporter };

type ReplModeOption = {
    enabled: boolean;
    beforeTest: boolean;
    onFail: boolean;
}

export class TestplaneToolAdapter extends BaseToolAdapter {
    private _tool: TestplaneEnhanced;
    private _config: ConfigAdapter;
    private _reporterConfig: ReporterConfig;
    private _htmlReporter: HtmlReporter;

    constructor(opts: BaseToolAdapterOptions) {
        super(opts);

        if ('tool' in opts) {
            this._tool = opts.tool as TestplaneEnhanced;
            this._reporterConfig = opts.reporterConfig;
        } else {
            // in order to not use static report with gui simultaneously
            process.env['html_reporter_enabled'] = false.toString();
            this._tool = Testplane.create(opts.configPath) as TestplaneEnhanced;

            const pluginOpts = getPluginOptions(this._tool.config);
            this._reporterConfig = parseConfig(pluginOpts);
        }

        this._config = 'config' in opts ? opts.config as TestplaneConfigAdapter : TestplaneConfigAdapter.create(this._tool.config);
        this._htmlReporter = HtmlReporter.create(this._reporterConfig, {toolName: ToolName.Testplane});

        // in order to be able to use it from other plugins as an API
        this._tool.htmlReporter = this._htmlReporter;
    }

    // TODO: should fix it ???
    static create<T extends BaseToolAdapter>(
        this: new (options: BaseToolAdapterOptions) => T,
        options: BaseToolAdapterOptions
    ): T {
        return new this(options);
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

    initGuiApi(): void {
        super.initGuiApi();

        if (!this._guiApi) {
            throw new Error('Gui API must be initialized before usage');
        }

        // in order to be able to use it from other plugins as an API
        this._tool.gui = this._guiApi.gui;
    }

    async readTests(paths: string[], cliTool: CommanderStatic): Promise<TestplaneTestCollectionAdapter> {
    // async readTests(paths: string[], cliTool: CommanderStatic): Promise<TestAdapter[]> {
        const {grep, set: sets, browser: browsers} = cliTool;
        const replMode = getReplModeOption(cliTool);

        // return this._tool.readTests(paths, {grep, sets, browsers, replMode});
        const testCollection = await this._tool.readTests(paths, {grep, sets, browsers, replMode});
        // const tests: TestAdapter[] = [];

        // collection.eachTest((test) => tests.push(TestplaneTest.create(test)));

        // return tests;

        // return collection;
        return TestplaneTestCollectionAdapter.create(testCollection);
    }

    // TODO: rename testCollection to something else
    async run(testCollection: TestplaneTestCollectionAdapter, tests: TestSpec[] = [], cliTool: CommanderStatic): Promise<boolean> {
    // async run(testCollection: TestAdapter[], tests: TestSpec[] = [], cliTool: CommanderStatic): Promise<boolean> {
        const {grep, set: sets, browser: browsers, devtools = false} = cliTool;
        const replMode = getReplModeOption(cliTool);
        const runner = createTestRunner(testCollection.originalTestCollection, tests);

        return runner.run((collection) => this._tool.run(collection, {grep, sets, browsers, devtools, replMode}));
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
}

function getPluginOptions(config: Config): Partial<ReporterConfig> {
    const defaultOpts = {};

    for (const toolName of [ToolName.Testplane, 'hermione']) {
        const opts = _.get(config.plugins, `html-reporter/${toolName}`, defaultOpts);

        if (!_.isEmpty(opts)) {
            return opts;
        }
    }

    return defaultOpts;
}

function getReplModeOption(cliTool: CommanderStatic): ReplModeOption {
    const {repl = false, replBeforeTest = false, replOnFail = false} = cliTool;

    return {
        enabled: repl || replBeforeTest || replOnFail,
        beforeTest: replBeforeTest,
        onFail: replOnFail
    };
}
