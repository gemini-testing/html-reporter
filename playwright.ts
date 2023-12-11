import {promisify} from 'util';

import {EventEmitter} from 'events';
import _ from 'lodash';
import PQueue from 'p-queue';
import workerFarm, {Workers} from 'worker-farm';
import type {Reporter, TestCase, TestResult as PwtTestResult} from '@playwright/test/reporter';

import {StaticReportBuilder} from './lib/report-builder/static';
import {HtmlReporter} from './lib/plugin-api';
import {ReporterConfig} from './lib/types';
import {parseConfig} from './lib/config';
import {PluginEvents, TestStatus, ToolName} from './lib/constants';
import {RegisterWorkers} from './lib/workers/create-workers';
import {PlaywrightTestAdapter, getStatus} from './lib/test-adapter/playwright';
import {SqliteClient} from './lib/sqlite-client';

export {ReporterConfig} from './lib/types';

class MyReporter implements Reporter {
    protected _promiseQueue: PQueue = new PQueue();
    protected _staticReportBuilder: StaticReportBuilder | null;
    protected _htmlReporter: HtmlReporter;
    protected _config: ReporterConfig;
    protected _workerFarm: Workers;
    protected _workers: RegisterWorkers<['saveDiffTo']>;
    protected _initPromise: Promise<void>;

    constructor(opts: Partial<ReporterConfig>) {
        this._config = parseConfig(_.omit(opts, ['configDir']));
        this._htmlReporter = HtmlReporter.create(this._config, {toolName: ToolName.Playwright});
        this._staticReportBuilder = null;
        this._workerFarm = workerFarm(require.resolve('./lib/workers/worker'), ['saveDiffTo']);

        const workers: RegisterWorkers<['saveDiffTo']> = new EventEmitter() as RegisterWorkers<['saveDiffTo']>;
        workers.saveDiffTo = (imageDiffError: unknown, diffPath: unknown): Promise<void> =>
            promisify<unknown, unknown, void>(this._workerFarm.saveDiffTo)(imageDiffError, diffPath);
        this._workers = workers;

        this._initPromise = (async (htmlReporter: HtmlReporter, config: ReporterConfig): Promise<void> => {
            const dbClient = await SqliteClient.create({htmlReporter, reportPath: config.path});

            this._staticReportBuilder = StaticReportBuilder.create(htmlReporter, config, {dbClient});
            this._staticReportBuilder.registerWorkers(workers);

            await this._staticReportBuilder.saveStaticFiles();
        })(this._htmlReporter, this._config);

        this._promiseQueue.add(async () => this._initPromise);
    }

    onTestEnd(test: TestCase, result: PwtTestResult): void {
        this._promiseQueue.add(async () => {
            await this._initPromise;

            const staticReportBuilder = this._staticReportBuilder as StaticReportBuilder;

            const status = getStatus(result);
            const formattedResult = new PlaywrightTestAdapter(test, result, {imagesInfoFormatter: staticReportBuilder.imageHandler});

            if (status === TestStatus.FAIL) {
                if (formattedResult.status === TestStatus.FAIL) {
                    await staticReportBuilder.addFail(formattedResult);
                } else {
                    await staticReportBuilder.addError(formattedResult);
                }
            } else if (status === TestStatus.SUCCESS) {
                await staticReportBuilder.addSuccess(formattedResult);
            } else if (status === TestStatus.SKIPPED) {
                await staticReportBuilder.addSkipped(formattedResult);
            }
        });
    }

    async onEnd(): Promise<void> {
        await this._promiseQueue.onIdle();

        await this._staticReportBuilder?.finalize();

        await this._htmlReporter.emitAsync(PluginEvents.REPORT_SAVED);
    }
}

export default MyReporter;
