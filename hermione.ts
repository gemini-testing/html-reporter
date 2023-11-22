import os from 'os';
import PQueue from 'p-queue';
import Hermione, {TestResult as HermioneTestResult} from 'hermione';

import {PluginAdapter} from './lib/plugin-adapter';
import {createWorkers, CreateWorkersRunner} from './lib/workers/create-workers';
import {FAIL, SUCCESS} from './lib/constants';
import {hasDiff} from './lib/common-utils';
import {formatTestResult} from './lib/server-utils';
import {ReporterConfig, ReporterOptions} from './lib/types';
import {StaticReportBuilder} from './lib/report-builder/static';
import {HermioneTestAdapter, ReporterTestResult} from './lib/test-adapter';

let workers: ReturnType<typeof createWorkers>;

export = (hermione: Hermione, opts: Partial<ReporterOptions>): void => {
    if (hermione.isWorker()) {
        return;
    }
    const plugin = PluginAdapter.create(hermione, opts);

    if (!plugin.isEnabled()) {
        return;
    }

    plugin
        .addApi()
        .addCliCommands()
        .init(prepare);

    hermione.on(hermione.events.RUNNER_START, (runner) => {
        workers = createWorkers(runner as unknown as CreateWorkersRunner);
    });
};

async function prepare(hermione: Hermione, reportBuilder: StaticReportBuilder, pluginConfig: ReporterConfig): Promise<void> {
    const {path: reportPath} = pluginConfig;
    const {imageHandler} = reportBuilder;

    const failHandler = async (testResult: HermioneTestResult): Promise<ReporterTestResult> => {
        const formattedResult = formatTestResult(testResult, FAIL, reportBuilder);
        const actions: Promise<unknown>[] = [imageHandler.saveTestImages(formattedResult, workers)];

        if (pluginConfig.saveErrorDetails && formattedResult.errorDetails) {
            actions.push((formattedResult as HermioneTestAdapter).saveErrorDetails(reportPath));
        }

        await Promise.all(actions);

        return formattedResult;
    };

    const addFail = (formattedResult: ReporterTestResult): ReporterTestResult => {
        return hasDiff(formattedResult.assertViewResults as {name?: string}[])
            ? reportBuilder.addFail(formattedResult)
            : reportBuilder.addError(formattedResult);
    };

    return new Promise((resolve, reject) => {
        const queue = new PQueue({concurrency: os.cpus().length});
        const promises: Promise<unknown>[] = [];

        hermione.on(hermione.events.TEST_PASS, testResult => {
            promises.push(queue.add(async () => {
                const formattedResult = formatTestResult(testResult, SUCCESS, reportBuilder);
                await imageHandler.saveTestImages(formattedResult, workers);

                return reportBuilder.addSuccess(formattedResult);
            }).catch(reject));
        });

        hermione.on(hermione.events.RETRY, testResult => {
            promises.push(queue.add(() => failHandler(testResult).then(addFail)).catch(reject));
        });

        hermione.on(hermione.events.TEST_FAIL, testResult => {
            promises.push(queue.add(() => failHandler(testResult).then(addFail)).catch(reject));
        });

        hermione.on(hermione.events.TEST_PENDING, testResult => {
            promises.push(queue.add(() => failHandler(testResult as HermioneTestResult).then((testResult) => reportBuilder.addSkipped(testResult)).catch(reject)));
        });

        hermione.on(hermione.events.RUNNER_END, () => {
            return Promise.all(promises).then(() => resolve(), reject);
        });
    });
}
