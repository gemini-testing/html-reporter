import PQueue from 'p-queue';

import type {Config as JestConfig} from 'jest';
import type {AggregatedResult, Reporter as JestReporter, Test, TestContext, TestResult} from '@jest/reporters';

import {StaticReportBuilder} from './lib/report-builder/static';
import {HtmlReporter} from './lib/plugin-api';
import {ReporterConfig, TestSpecByPath} from './lib/types';
import {parseConfig} from './lib/config';
import {PluginEvents, ToolName} from './lib/constants';
import {SqliteClient} from './lib/sqlite-client';
import {SqliteImageStore} from './lib/image-store';
import {ImagesInfoSaver} from './lib/images-info-saver';
import {Cache} from './lib/cache';
import {getExpectedCacheKey} from './lib/server-utils';
import {JestTestResultAdapter} from './lib/adapters/test-result/jest';

export {ReporterConfig} from './lib/types';

class JestHtmlReporter implements JestReporter {
    protected _promiseQueue: PQueue = new PQueue();
    protected _staticReportBuilder: StaticReportBuilder | null;
    protected _htmlReporter: HtmlReporter;
    protected _initPromise: Promise<void>;

    protected _globalConfig: JestConfig;
    protected _config: ReporterConfig;
    protected _context: unknown; // Reporter context passed from test scheduler

    constructor(globalConfig: JestConfig, opts: Partial<ReporterConfig>, reporterContext: unknown) {
        this._config = parseConfig(opts);

        this._globalConfig = globalConfig;
        this._context = reporterContext;

        this._htmlReporter = HtmlReporter.create(this._config, {toolName: ToolName.Jest});
        this._staticReportBuilder = null;

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

            await this._staticReportBuilder.saveStaticFiles();
        })(this._htmlReporter, this._config);

        this._promiseQueue.add(async () => this._initPromise);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onTestResult(test: Test, testResult: TestResult, _aggregatedResult: AggregatedResult): void {
        this._promiseQueue.add(async () => {
            await this._initPromise;

            const staticReportBuilder = this._staticReportBuilder as StaticReportBuilder;

            await Promise.all(
                testResult.testResults.map(
                    assertion => staticReportBuilder.addTestResult(
                        new JestTestResultAdapter(test, testResult, assertion)
                    )
                )
            );
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onRunComplete(_testContexts: Set<TestContext>, _results: AggregatedResult) : Promise<void> {
        await this._promiseQueue.onIdle();

        await this._staticReportBuilder?.finalize();

        await this._htmlReporter.emitAsync(PluginEvents.REPORT_SAVED);
    }
}

module.exports = JestHtmlReporter;
