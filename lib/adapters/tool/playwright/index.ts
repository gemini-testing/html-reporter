import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';

import execa from 'execa';
import npmWhich from 'npm-which';
import PQueue from 'p-queue';
import _ from 'lodash';
import type {CommanderStatic} from '@gemini-testing/commander';

import {BaseToolAdapter, type ToolAdapterOptionsFromCli, type UpdateReferenceOpts} from '../base';
import {PlaywrightConfigAdapter} from '../../config/playwright';
import {PlaywrightTestCollectionAdapter} from '../../test-collection/playwright';
import {parseConfig} from '../../../config';
import {HtmlReporter} from '../../../plugin-api';
import {setupTransformHook} from './transformer';
import {ToolName, UNKNOWN_ATTEMPT, PWT_TITLE_DELIMITER} from '../../../constants';
import {ClientEvents} from '../../../gui/constants';

// import {getStatus} from '../../../test-adapter/playwright';
import {PlaywrightTestAdapter} from '../../../test-adapter/playwright';

import type {GuiReportBuilder} from '../../../report-builder/gui';
import type {EventSource} from '../../../gui/event-source';
import type {PwtTest} from '../../test/playwright';
import type {ConfigAdapter} from '../../config/index';
import type {ReporterConfig} from '../../../types';
import type {TestSpec} from '../types';
import type {TestCase, TestResult} from '@playwright/test/reporter';

export class PlaywrightToolAdapter extends BaseToolAdapter {
    private _config: ConfigAdapter;
    private _reporterConfig: ReporterConfig;
    private _htmlReporter: HtmlReporter;
    private _pwtBinaryPath: string;
    private _reportBuilder!: GuiReportBuilder;
    private _eventSource!: EventSource;
    // private _queue: PQueue;

    constructor(opts: ToolAdapterOptionsFromCli) {
        super(opts);

        this._config = opts.config as PlaywrightConfigAdapter;

        // TODO: get opts from config file
        const pluginOpts = {};
        this._reporterConfig = parseConfig(pluginOpts);

        this._htmlReporter = HtmlReporter.create(this._reporterConfig, {toolName: ToolName.Playwright});

        this._pwtBinaryPath = npmWhich.sync(ToolName.Playwright, {cwd: process.cwd()});

        // this._queue = new PQueue({concurrency: os.cpus().length});
        // const cfg = (await import(process.cwd() + this._configPath)).default;
    }

    // static async create<T extends PlaywrightToolAdapter>(
    //     this: new (options: BaseToolAdapterOptions) => T,
    //     options: BaseToolAdapterOptions
    // ): Promise<T> {
    static async create(options: ToolAdapterOptionsFromCli): Promise<PlaywrightToolAdapter> {
        const configPath = options.configPath || 'playwright.config.ts';
        console.log('configPath 123:', configPath);

        const revertTransformHook = setupTransformHook();

        const originalConfig = (await import(process.cwd() + '/' + configPath)).default;

        revertTransformHook();

        // TODO: change condition
        const config = options.config ? options.config : PlaywrightConfigAdapter.create(originalConfig);

        return new this({...options, config});
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

    async readTests(paths: string[], cliTool: CommanderStatic): Promise<PlaywrightTestCollectionAdapter> {
        console.log('readTests, paths:', paths);
        console.log('readTests, cliTool:', cliTool);

        const {stdout} = await execa(this._pwtBinaryPath, ['test', '--list']);

        const tests = stdout.split('\n').map(v => v.trim()).filter(v => v.startsWith('[')).map(v => {
            const [browserName, file, title] = v.split(' › ');
            return {
                browserName: browserName.slice(1, -1),
                file: file.split(':')[0],
                title
            } as PwtTest;
        });

        console.log('readTests, tests:', tests);

        return PlaywrightTestCollectionAdapter.create(tests);
    }

    async run(testCollection: PlaywrightTestCollectionAdapter, tests: TestSpec[] = [], cliTool: CommanderStatic): Promise<boolean> {
        console.log('run, testCollection:', testCollection);
        console.log('run, tests:', tests);
        console.log('run, cliTool:', cliTool);

        const queue = new PQueue({concurrency: os.cpus().length});

        // async run(testCollection: TestAdapter[], tests: TestSpec[] = [], cliTool: CommanderStatic): Promise<boolean> {
        // const {grep, set: sets, browser: browsers, devtools = false} = cliTool;
        // const replMode = getReplModeOption(cliTool);
        // const runner = createTestRunner(testCollection.originalTestCollection, tests);

        // return runner.run((collection) => this._tool.run(collection, {grep, sets, browsers, devtools, replMode}));

        // const args = ['test', '--reporter', path.resolve(__dirname, './reporter')];
        // console.log('args:', args);
        // console.log('__filename:', __filename);
        // console.log('__dirname:', __dirname);

        console.log('this._reportBuilder:', this._reportBuilder);
        console.log('this._eventSource:', this._eventSource);

        return new Promise((resolve, reject) => {
            const args = ['test', '--reporter', path.resolve(__dirname, './reporter')];
            console.log('args:', args);

            // TODO: send signal to abort it if something goes wrong
            const child = spawn(this._pwtBinaryPath, args, {
                stdio: ['inherit', 'inherit', 'inherit', 'ipc']
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            child.on('message', (data: any) => {
                console.log('CHILD MESSAGE:', data);

                queue.add(async () => {
                    if (typeof data === 'object') {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        if (data.event === ClientEvents.BEGIN_STATE || data.event === ClientEvents.TEST_RESULT) {
                            console.log('ClientEvents, data:', data);
                            const test = JSON.parse(data.test) as TestCase;
                            const result = JSON.parse(data.result) as TestResult;

                            console.log('test:', test);
                            console.log('result:', result);
                            console.log('data.browserName:', data.browserName);

                            const testCase = {
                                ...test,
                                titlePath: () => ['', '', '', test.title.split(PWT_TITLE_DELIMITER)],
                                parent: {
                                    ...test.parent,
                                    project: () => ({
                                        name: data.browserName
                                    })
                                }
                            } as TestCase;

                            const testResult = {
                                ...result,
                                startTime: new Date(result.startTime)
                            } as TestResult;

                            // const status = getStatus(result);
                            console.log('BEFORE CREATE FORMATTER RESULT');

                            const formattedResultWithoutAttempt = new PlaywrightTestAdapter(testCase, testResult, UNKNOWN_ATTEMPT);

                            console.log('formattedResultWithoutAttempt:', formattedResultWithoutAttempt);

                            // TODO: use queue HERE (in this file)!!!
                            const formattedResult = await this._reportBuilder.addTestResult(formattedResultWithoutAttempt);
                            const testBranch = this._reportBuilder.getTestBranch(formattedResult.id);

                            return this._eventSource.emit(data.event, testBranch);
                        } else if (data.event === ClientEvents.END) {
                            await queue.onIdle();

                            this._eventSource.emit(data.event, _.omit(data, 'event'));
                        } else {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            this._eventSource.emit((data as any).event, _.omit(data, 'event')); // TODO: get into account case with END event (only event shoul be send)
                        }
                    }
                });
            });

            child.on('error', (data) => {
                console.log('ERROR, data:', data);
                reject(data);
            });

            child.on('exit', (code) => {
                console.log(`child process exited with code ${code}`);

                resolve(Boolean(code));
            });
        });

        // const sub = await execa(this._pwtBinaryPath, args);
        // const sub = spawn(this._pwtBinaryPath, args, {
        //     stdio: ['inherit', 'inherit', 'inherit', 'ipc']
        // });
        // // console.log('sub:', sub);

        // sub.on('message', (data) => {
        //     console.log('data:', data);
        // });

        // sub.on('error', (data) => {
        //     console.log('ERROR, data:', data);
        // });

        // // sub.on('close', (code) => {
        // //     console.log(`child process close all stdio with code ${code}`);
        // // });

        // sub.on('exit', (code) => {
        //     console.log(`child process exited with code ${code}`);
        // });

        // // sub.stdout.on('data', (data) => {
        // //     console.log(`stdout, data: ${data}`);
        // // });

        // // process.send('child -> parend');
        // sub.send('hello world');

        // // sub.on('message')
        // // console.log('run stdout:', stdout);

        // return false;
    }

    updateReference(opts: UpdateReferenceOpts): void {
        console.log('update Reference, opts:', opts);
    }

    handleTestResults(reportBuilder: GuiReportBuilder, eventSource: EventSource): void {
        console.log('handleTestResults, reportBuilder:', reportBuilder);
        console.log('handleTestResults, eventSource:', eventSource);

        this._reportBuilder = reportBuilder;
        this._eventSource = eventSource;

        // handleTestResults(this._tool, reportBuilder, eventSource);
    }

    halt(err: Error, timeout: number): void {
        console.log('halt, err:', err);
        console.log('halt, timeout:', timeout);
    }
}

// .action(async (_paths, options) => {
//     console.log('options:', options);

//     if (!options.parent.tool) {
//         throw new Error('tool name is required');
//     }

//     if (options.parent.tool !== 'testplane') {
//         throw new Error('Only testplane is supported now');
//     }

//     console.log('options.parent.tool:', options.parent.tool);

//     const revertTransformHook = setupTransformHook();

//     const cfg = (await import(process.cwd() + '/playwright.config')).default;

//     revertTransformHook();

//     console.log('cfg:', cfg);

//     // TODO: get html reporter config (can be just a string or arrey with config
//     // then parse passed config to get defaults

//     const pwtPath = npmWhich.sync('playwright', {cwd: process.cwd()});
//     console.log('pwtPath:', pwtPath);

//     const {stdout} = await execa(pwtPath, ['test', '--list']);

//     const tests = stdout.split('\n').map(v => v.trim()).filter(v => v.startsWith('[')).map(v => {
//         const [browserName, file, title] = v.split(' › ');
//         return {
//             browserName: browserName.slice(1, -1),
//             file: file.split(':')[0],
//             title
//         };
//     });
//     console.log('tests:', tests);

//     /*
//         TODO:
//         - find playwright config, read it and parse reporters field with `html-reporter/playwright`
//         - parse config using config parser
//         - read tests (get browser name, file, full title)

//     */
// });
