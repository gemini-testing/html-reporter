import {promisify} from 'util';

import {EventEmitter} from 'events';
import _ from 'lodash';
import PQueue from 'p-queue';
import workerFarm, {Workers} from 'worker-farm';
import type {Reporter, TestCase, TestResult as PwtTestResult} from '@playwright/test/reporter';

import {StaticReportBuilder} from './lib/report-builder/static';
import {HtmlReporter} from './lib/plugin-api';
import {ReporterConfig, TestSpecByPath} from './lib/types';
import {parseConfig} from './lib/config';
import {PluginEvents, ToolName, UNKNOWN_ATTEMPT} from './lib/constants';
import {RegisterWorkers} from './lib/workers/create-workers';
import {PlaywrightTestResultAdapter} from './lib/adapters/test-result/playwright';
import {SqliteClient} from './lib/sqlite-client';
import {SqliteImageStore} from './lib/image-store';
import {ImagesInfoSaver} from './lib/images-info-saver';
import {Cache} from './lib/cache';
import {getExpectedCacheKey} from './lib/server-utils';

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
        const reporterOpts = _.omitBy(opts, (_value, key) => key === 'configDir' || key.startsWith('_'));

        this._config = parseConfig(reporterOpts);
        this._htmlReporter = HtmlReporter.create(this._config, {toolName: ToolName.Playwright});
        this._staticReportBuilder = null;
        this._workerFarm = workerFarm(require.resolve('./lib/workers/worker'), ['saveDiffTo']);

        const workers: RegisterWorkers<['saveDiffTo']> = new EventEmitter() as RegisterWorkers<['saveDiffTo']>;
        workers.saveDiffTo = (imageDiffError: unknown, diffPath: unknown): Promise<void> =>
            promisify<unknown, unknown, void>(this._workerFarm.saveDiffTo)(imageDiffError, diffPath);
        this._workers = workers;

        this._initPromise = (async (htmlReporter: HtmlReporter, config: ReporterConfig): Promise<void> => {
            const dbClient = await SqliteClient.create({htmlReporter, reportPath: config.path});
            const imageStore = new SqliteImageStore(dbClient);
            const expectedPathsCache = new Cache<[TestSpecByPath, string | undefined], string>(getExpectedCacheKey);

            const imagesInfoSaver = new ImagesInfoSaver({
                imageFileSaver: htmlReporter.imagesSaver,
                expectedPathsCache,
                imageStore,
                reportPath: htmlReporter.config.path
            });

            this._staticReportBuilder = StaticReportBuilder.create({htmlReporter, reporterConfig: config, dbClient, imagesInfoSaver});
            this._staticReportBuilder.registerWorkers(workers);

            await this._staticReportBuilder.saveStaticFiles();
        })(this._htmlReporter, this._config);

        this._promiseQueue.add(async () => this._initPromise);
    }

    onTestEnd(test: TestCase, result: PwtTestResult): void {
        this._promiseQueue.add(async () => {
            await this._initPromise;

            const staticReportBuilder = this._staticReportBuilder as StaticReportBuilder;

            const formattedResult = new PlaywrightTestResultAdapter(test, result, UNKNOWN_ATTEMPT);

            await staticReportBuilder.addTestResult(formattedResult);
        });
    }

    async onEnd(): Promise<void> {
        await this._promiseQueue.onIdle();

        await this._staticReportBuilder?.finalize();

        await this._htmlReporter.emitAsync(PluginEvents.REPORT_SAVED);
    }
}

export default MyReporter;
