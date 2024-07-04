import type {Config, TestCollection} from 'testplane';
import type {CommanderStatic} from '@gemini-testing/commander';

import {GuiApi} from '../../gui/api';
import {EventSource} from '../../gui/event-source';
import {GuiReportBuilder} from '../../report-builder/gui';
import {ToolName} from '../../constants';

import type {ReporterConfig, ImageFile} from '../../types';
import type {TestSpec} from './types';

export interface ToolAdapterOptionsFromCli {
    toolName: ToolName;
    configPath?: string;
}

export interface UpdateReferenceOpts {
    refImg: ImageFile;
    state: string;
}

export interface ToolAdapter {
    readonly toolName: ToolName;
    readonly config: Config;
    readonly reporterConfig: ReporterConfig;
    readonly guiApi?: GuiApi;

    initGuiApi(): void;
    readTests(paths: string[], cliTool: CommanderStatic): Promise<TestCollection>;
    run(testCollection: TestCollection, tests: TestSpec[], cliTool: CommanderStatic): Promise<boolean>;

    updateReference(opts: UpdateReferenceOpts): void;
    handleTestResults(reportBuilder: GuiReportBuilder, eventSource: EventSource): void;

    halt(err: Error, timeout: number): void;
}

export const makeToolAdapter = async (opts: ToolAdapterOptionsFromCli): Promise<ToolAdapter> => {
    if (opts.toolName === ToolName.Testplane) {
        const {TestplaneToolAdapter} = await import('./testplane');

        return TestplaneToolAdapter.create(opts);
    } else if (opts.toolName === ToolName.Playwright) {
        throw new Error('Playwright is not supported yet');
    } else {
        throw new Error(`Tool adapter with name: "${opts.toolName}" is not supported`);
    }
};
