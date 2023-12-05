import os from 'os';
import path from 'path';
import Hermione, {TestResult as HermioneTestResult} from 'hermione';
import _ from 'lodash';
import PQueue from 'p-queue';
import {CommanderStatic} from '@gemini-testing/commander';

import {cliCommands} from './lib/cli-commands';
import {hasDiff} from './lib/common-utils';
import {parseConfig} from './lib/config';
import {FAIL, SUCCESS, ToolName} from './lib/constants';
import {HtmlReporter} from './lib/plugin-api';
import {StaticReportBuilder} from './lib/report-builder/static';
import {formatTestResult, logPathToHtmlReport, logError} from './lib/server-utils';
import {SqliteClient} from './lib/sqlite-client';
import {HermioneTestAdapter, ReporterTestResult} from './lib/test-adapter';
import {TestAttemptManager} from './lib/test-attempt-manager';
import {HtmlReporterApi, ReporterConfig, ReporterOptions} from './lib/types';
import {createWorkers, CreateWorkersRunner} from './lib/workers/create-workers';

let workers: ReturnType<typeof createWorkers>;

export = (hermione: Hermione, opts: Partial<ReporterOptions>): void => {
    if (hermione.isWorker()) {
        return;
    }

    const config = parseConfig(opts);

    if (!config.enabled) {
        return;
    }

    const htmlReporter = HtmlReporter.create(config, {toolName: ToolName.Hermione});

    (hermione as Hermione & HtmlReporterApi).htmlReporter = htmlReporter;

    let isCliCommandLaunched = false;
    let handlingTestResults: Promise<void>;

    hermione.on(hermione.events.CLI, (commander: CommanderStatic) => {
        _.values(cliCommands).forEach((command: string) => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require(path.resolve(__dirname, 'lib/cli-commands', command))(commander, config, hermione);

            commander.prependListener(`command:${command}`, () => {
                isCliCommandLaunched = true;
            });
        });
    });

    hermione.on(hermione.events.INIT, async () => {
        if (isCliCommandLaunched) {
            return;
        }

        const dbClient = await SqliteClient.create({htmlReporter, reportPath: config.path});
        const testAttemptManager = new TestAttemptManager();
        const staticReportBuilder = StaticReportBuilder.create(htmlReporter, config, {dbClient, testAttemptManager});

        handlingTestResults = Promise.all([
            staticReportBuilder.saveStaticFiles(),
            handleTestResults(hermione, staticReportBuilder, config)
        ]).then(async () => {
            await staticReportBuilder.finalize();
        }).then(async () => {
            await htmlReporter.emitAsync(htmlReporter.events.REPORT_SAVED, {reportPath: config.path});
        });
    });

    hermione.on(hermione.events.RUNNER_START, (runner) => {
        workers = createWorkers(runner as unknown as CreateWorkersRunner);
    });

    hermione.on(hermione.events.RUNNER_END, async () => {
        try {
            await handlingTestResults;

            logPathToHtmlReport(config);
        } catch (e: unknown) {
            logError(e as Error);
        }
    });
};

async function handleTestResults(hermione: Hermione, reportBuilder: StaticReportBuilder, pluginConfig: ReporterConfig): Promise<void> {
    const {path: reportPath} = pluginConfig;
    const {imageHandler} = reportBuilder;

    const failHandler = async (testResult: HermioneTestResult): Promise<ReporterTestResult> => {
        const attempt = reportBuilder.testAttemptManager.registerAttempt({fullName: testResult.fullTitle(), browserId: testResult.browserId}, FAIL);
        const formattedResult = formatTestResult(testResult, FAIL, attempt, reportBuilder);

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
                const attempt = reportBuilder.testAttemptManager.registerAttempt({fullName: testResult.fullTitle(), browserId: testResult.browserId}, FAIL);
                const formattedResult = formatTestResult(testResult, SUCCESS, attempt, reportBuilder);
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
