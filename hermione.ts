import os from 'os';
import path from 'path';
import Hermione, {TestResult as HermioneTestResult} from 'hermione';
import _ from 'lodash';
import PQueue from 'p-queue';
import {CommanderStatic} from '@gemini-testing/commander';

import {cliCommands} from './lib/cli-commands';
import {parseConfig} from './lib/config';
import {ToolName} from './lib/constants';
import {HtmlReporter} from './lib/plugin-api';
import {StaticReportBuilder} from './lib/report-builder/static';
import {formatTestResult, logPathToHtmlReport, logError, getExpectedCacheKey} from './lib/server-utils';
import {SqliteClient} from './lib/sqlite-client';
import {HtmlReporterApi, ReporterOptions, TestSpecByPath} from './lib/types';
import {createWorkers, CreateWorkersRunner} from './lib/workers/create-workers';
import {SqliteImageStore} from './lib/image-store';
import {Cache} from './lib/cache';
import {ImagesInfoSaver} from './lib/images-info-saver';
import {getStatus} from './lib/test-adapter/hermione';

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
    let staticReportBuilder: StaticReportBuilder;

    const withMiddleware = <T extends (...args: unknown[]) => unknown>(fn: T):
        (...args: Parameters<T>) => ReturnType<T> | undefined => {
        return (...args: unknown[]) => {
            // If any CLI command was launched, e.g. merge-reports, we need to interrupt regular flow
            if (isCliCommandLaunched) {
                return;
            }

            return fn.call(undefined, ...args) as ReturnType<T>;
        };
    };

    hermione.on(hermione.events.CLI, (commander: CommanderStatic) => {
        _.values(cliCommands).forEach((command: string) => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require(path.resolve(__dirname, 'lib/cli-commands', command))(commander, config, hermione);

            commander.prependListener(`command:${command}`, () => {
                isCliCommandLaunched = true;
            });
        });
    });

    hermione.on(hermione.events.INIT, withMiddleware(async () => {
        const dbClient = await SqliteClient.create({htmlReporter, reportPath: config.path});
        const imageStore = new SqliteImageStore(dbClient);
        const expectedPathsCache = new Cache<[TestSpecByPath, string | undefined], string>(getExpectedCacheKey);

        const imagesInfoSaver = new ImagesInfoSaver({
            imageFileSaver: htmlReporter.imagesSaver,
            expectedPathsCache,
            imageStore,
            reportPath: htmlReporter.config.path
        });

        staticReportBuilder = StaticReportBuilder.create(htmlReporter, config, {dbClient, imagesInfoSaver});

        handlingTestResults = Promise.all([
            staticReportBuilder.saveStaticFiles(),
            handleTestResults(hermione, staticReportBuilder)
        ]).then(async () => {
            await staticReportBuilder.finalize();
        }).then(async () => {
            await htmlReporter.emitAsync(htmlReporter.events.REPORT_SAVED, {reportPath: config.path});
        });

        htmlReporter.emit(htmlReporter.events.DATABASE_CREATED, dbClient.getRawConnection());
    }));

    hermione.on(hermione.events.RUNNER_START, withMiddleware((runner) => {
        staticReportBuilder.registerWorkers(createWorkers(runner as unknown as CreateWorkersRunner));
    }));

    hermione.on(hermione.events.RUNNER_END, withMiddleware(async () => {
        try {
            await handlingTestResults;

            logPathToHtmlReport(config);
        } catch (e: unknown) {
            logError(e as Error);
        }
    }));
};

async function handleTestResults(hermione: Hermione, reportBuilder: StaticReportBuilder): Promise<void> {
    return new Promise((resolve, reject) => {
        const queue = new PQueue({concurrency: os.cpus().length});
        const promises: Promise<unknown>[] = [];

        [
            {eventName: hermione.events.TEST_PASS},
            {eventName: hermione.events.RETRY},
            {eventName: hermione.events.TEST_FAIL},
            {eventName: hermione.events.TEST_PENDING}
        ].forEach(({eventName}) => {
            type AnyHermioneTestEvent = typeof hermione.events.TEST_PASS;

            hermione.on(eventName as AnyHermioneTestEvent, (testResult: HermioneTestResult) => {
                promises.push(queue.add(async () => {
                    const formattedResult = formatTestResult(testResult, getStatus(eventName, hermione.events, testResult));

                    await reportBuilder.addTestResult(formattedResult);
                }).catch(reject));
            });
        });

        hermione.on(hermione.events.RUNNER_END, () => {
            return Promise.all(promises).then(() => resolve(), reject);
        });
    });
}
