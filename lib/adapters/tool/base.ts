import Testplane, {type Config, type TestCollection} from 'testplane';
import type {CommanderStatic} from '@gemini-testing/commander';
import {GuiApi} from '../../gui/api';
import {HtmlReporter} from '../../plugin-api';
import {EventSource} from '../../gui/event-source';
import {GuiReportBuilder} from '../../report-builder/gui';
import {ToolName} from '../../constants';

import type {ReporterConfig, ImageFile} from '../../types';
import type {TestSpec} from './types';

interface ToolAdapterOptionsFromCli {
    toolName: ToolName;
    configPath?: string;
}

interface TestplaneAdapterOptionsFromPlugin {
    toolName: ToolName.Testplane;
    tool: Testplane;
    reporterConfig: ReporterConfig;
}

export interface UpdateReferenceOpts {
    refImg: ImageFile;
    state: string;
}

export type BaseToolAdapterOptions = ToolAdapterOptionsFromCli | TestplaneAdapterOptionsFromPlugin;

export abstract class BaseToolAdapter {
    protected _toolName: ToolName;
    protected _configPath?: string;
    protected _guiApi?: GuiApi;

    constructor(opts: BaseToolAdapterOptions) {
        this._toolName = opts.toolName;

        if ('configPath' in opts) {
            this._configPath = opts.configPath;
        }
    }

    static create<T extends BaseToolAdapter>(
        this: new (options: BaseToolAdapterOptions) => T,
        options: BaseToolAdapterOptions
    ): T {
        return new this(options);
    }

    get toolName(): ToolName {
        return this._toolName;
    }

    get guiApi(): GuiApi | undefined {
        return this._guiApi;
    }

    initGuiApi(): void {
        this._guiApi = GuiApi.create();
    }

    abstract get config(): Config;
    abstract get reporterConfig(): ReporterConfig;
    abstract get htmlReporter(): HtmlReporter;

    abstract readTests(paths: string[], cliTool: CommanderStatic): Promise<TestCollection>;
    abstract run(testCollection: TestCollection, tests: TestSpec[], cliTool: CommanderStatic): Promise<boolean>;

    abstract updateReference(opts: UpdateReferenceOpts): void;
    abstract handleTestResults(reportBuilder: GuiReportBuilder, eventSource: EventSource): void;

    abstract halt(err: Error, timeout: number): void;
}
