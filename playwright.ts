import {promisify} from 'util';
import _ from 'lodash';
import type {Reporter, TestCase, TestResult as PwtTestResult} from '@playwright/test/reporter';
import workerFarm, {Workers} from 'worker-farm';

import {StaticReportBuilder} from './lib/report-builder/static';
import {HtmlReporter} from './lib/plugin-api';
import {ReporterConfig} from './lib/types';
import {parseConfig} from './lib/config';
import {TestStatus, ToolName} from './lib/constants';
import {RegisterWorkers} from './lib/workers/create-workers';
import {EventEmitter} from 'events';
import {PlaywrightTestAdapter} from './lib/test-adapter/playwright';

enum PwtTestStatus {
    PASSED = 'passed',
    FAILED = 'failed',
    TIMED_OUT = 'timedOut',
    INTERRUPTED = 'interrupted',
    SKIPPED = 'skipped',
}

export const getStatus = (result: PwtTestResult): TestStatus => {
    if (result.status === PwtTestStatus.PASSED) {
        return TestStatus.SUCCESS;
    }

    if (
        [PwtTestStatus.FAILED, PwtTestStatus.TIMED_OUT, PwtTestStatus.INTERRUPTED].includes(
            result.status as PwtTestStatus
        )
    ) {
        return TestStatus.FAIL;
    }

    return TestStatus.SKIPPED;
};

class MyReporter implements Reporter {
    protected _resultPromise: Promise<void> = Promise.resolve();
    protected _staticReportBuilder: StaticReportBuilder;
    protected _htmlReporter: HtmlReporter;
    protected _config: ReporterConfig;
    protected _workerFarm: Workers;
    protected _workers: RegisterWorkers<['saveDiffTo']>;

    constructor(opts: Partial<ReporterConfig>) {
        this._config = parseConfig(_.omit(opts, ['configDir']));
        this._htmlReporter = HtmlReporter.create(this._config, {toolName: ToolName.Playwright});
        this._staticReportBuilder = StaticReportBuilder.create(this._htmlReporter, this._config);
        this._workerFarm = workerFarm(require.resolve('./lib/workers/worker'), ['saveDiffTo']);

        const workers: RegisterWorkers<['saveDiffTo']> = new EventEmitter() as RegisterWorkers<['saveDiffTo']>;
        workers.saveDiffTo = (imageDiffError: unknown, diffPath: unknown): Promise<void> =>
            promisify<unknown, unknown, void>(this._workerFarm.saveDiffTo)(imageDiffError, diffPath);
        this._workers = workers;

        this._addTask(this._staticReportBuilder.init().then(() => this._staticReportBuilder.saveStaticFiles()));
    }

    protected _addTask(promise: Promise<void>): void {
        this._resultPromise = this._resultPromise.then(() => promise);
    }

    onTestEnd(test: TestCase, result: PwtTestResult): void {
        const status = getStatus(result);
        const formattedResult = new PlaywrightTestAdapter(test, result, {imagesInfoFormatter: this._staticReportBuilder.imageHandler});

        if (status === TestStatus.FAIL) {
            if (formattedResult.status === TestStatus.FAIL) {
                this._staticReportBuilder.addFail(formattedResult);
            } else {
                this._staticReportBuilder.addError(formattedResult);
            }
            this._addTask(this._staticReportBuilder.imageHandler.saveTestImages(formattedResult, this._workers).then());
        } else if (status === TestStatus.SUCCESS) {
            this._staticReportBuilder.addSuccess(formattedResult);
        } else if (status === TestStatus.SKIPPED) {
            this._staticReportBuilder.addSkipped(formattedResult);
        }
    }

    async onEnd(): Promise<void> {
        this._addTask(this._staticReportBuilder.finalize());
        // TODO: emit report saved event or not?

        return this._resultPromise;
    }
}

export default MyReporter;
