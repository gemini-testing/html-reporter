import os from 'os';
import path from 'path';
import type Testplane from 'testplane';
import type {TestResult as TestplaneTestResult} from 'testplane';
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
import {getStatus} from './lib/test-adapter/testplane';

export default (testplane: Testplane, opts: Partial<ReporterOptions>): void => {
    if (testplane.isWorker()) {
        return;
    }

    const config = parseConfig(opts);

    if (!config.enabled) {
        return;
    }

    const htmlReporter = HtmlReporter.create(config, {toolName: ToolName.Testplane});

    (testplane as Testplane & HtmlReporterApi).htmlReporter = htmlReporter;

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

    testplane.on(testplane.events.CLI, (commander: CommanderStatic) => {
        _.values(cliCommands).forEach((command: string) => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require(path.resolve(__dirname, 'lib/cli-commands', command))(commander, config, testplane);

            commander.prependListener(`command:${command}`, () => {
                isCliCommandLaunched = true;
            });
        });
    });

    testplane.on(testplane.events.INIT, withMiddleware(async () => {
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
            handleTestResults(testplane, staticReportBuilder)
        ]).then(async () => {
            await staticReportBuilder.finalize();
        }).then(async () => {
            await htmlReporter.emitAsync(htmlReporter.events.REPORT_SAVED, {reportPath: config.path});
        });

        htmlReporter.emit(htmlReporter.events.DATABASE_CREATED, dbClient.getRawConnection());
    }));

    testplane.on(testplane.events.RUNNER_START, withMiddleware((runner) => {
        staticReportBuilder.registerWorkers(createWorkers(runner as unknown as CreateWorkersRunner));
    }));

    testplane.on(testplane.events.RUNNER_END, withMiddleware(async () => {
        try {
            await handlingTestResults;

            logPathToHtmlReport(config);
        } catch (e: unknown) {
            logError(e as Error);
        }
    }));
};

async function handleTestResults(testplane: Testplane, reportBuilder: StaticReportBuilder): Promise<void> {
    return new Promise((resolve, reject) => {
        const queue = new PQueue({concurrency: os.cpus().length});
        const promises: Promise<unknown>[] = [];

        [
            {eventName: testplane.events.TEST_PASS},
            {eventName: testplane.events.RETRY},
            {eventName: testplane.events.TEST_FAIL},
            {eventName: testplane.events.TEST_PENDING}
        ].forEach(({eventName}) => {
            type AnyTestplaneTestEvent = typeof testplane.events.TEST_PASS;

            testplane.on(eventName as AnyTestplaneTestEvent, (testResult: TestplaneTestResult) => {
                promises.push(queue.add(async () => {
                    const formattedResult = formatTestResult(testResult, getStatus(eventName, testplane.events, testResult));

                    await reportBuilder.addTestResult(formattedResult);
                }).catch(reject));
            });
        });

        testplane.on(testplane.events.RUNNER_END, () => {
            return Promise.all(promises).then(() => resolve(), reject);
        });
    });
}
