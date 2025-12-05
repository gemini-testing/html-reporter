import os from 'os';
import path from 'path';
import type Testplane from 'testplane';
import type {TestResult as TestplaneTestResult} from 'testplane';
import _ from 'lodash';
import PQueue from 'p-queue';
import type {CommanderStatic} from '@gemini-testing/commander';

import type {TestplaneWithHtmlReporter} from './lib/adapters/tool/testplane';
import {cliCommands} from './lib/cli/commands';
import {parseConfig} from './lib/config';
import {ToolName, UNKNOWN_ATTEMPT} from './lib/constants';
import type {StaticReportBuilder} from './lib/report-builder/static';
import {formatTestResult, logPathToHtmlReport, logError, getExpectedCacheKey} from './lib/server-utils';
import type {Attachment, ReporterOptions, TestSpecByPath} from './lib/types';
import {createWorkers, CreateWorkersRunner} from './lib/workers/create-workers';
import {Cache} from './lib/cache';
import {copyAndUpdate} from './lib/adapters/test-result/utils';

export default (testplane: Testplane, opts: Partial<ReporterOptions>): void => {
    if (testplane.isWorker()) {
        return;
    }

    const config = parseConfig(opts);

    Object.assign(opts, config);

    if (!config.enabled) {
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {TestplaneToolAdapter} = require('./lib/adapters/tool/testplane');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {StaticReportBuilder} = require('./lib/report-builder/static');
    const toolAdapter = TestplaneToolAdapter.create({toolName: ToolName.Testplane, tool: testplane, reporterConfig: config});
    const {htmlReporter} = toolAdapter;

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
            require(path.resolve(__dirname, 'lib/cli/commands', command))(commander, toolAdapter);

            commander.prependListener(`command:${command}`, () => {
                isCliCommandLaunched = true;
            });
        });
    });

    testplane.on(testplane.events.INIT, withMiddleware(async () => {
        const [{SqliteClient}, {SqliteImageStore}, {ImagesInfoSaver}] = await Promise.all([
            import('./lib/sqlite-client'),
            import('./lib/image-store'),
            import('./lib/images-info-saver')
        ]);
        const dbClient = await SqliteClient.create({htmlReporter, reportPath: config.path});
        const imageStore = new SqliteImageStore(dbClient);
        const expectedPathsCache = new Cache<[TestSpecByPath, string | undefined], string>(getExpectedCacheKey);

        const imagesInfoSaver = new ImagesInfoSaver({
            imageFileSaver: htmlReporter.imagesSaver,
            expectedPathsCache,
            imageStore,
            reportPath: htmlReporter.config.path
        });

        staticReportBuilder = StaticReportBuilder.create({
            htmlReporter: toolAdapter.htmlReporter,
            reporterConfig: config,
            dbClient,
            imagesInfoSaver
        });

        handlingTestResults = Promise.all([
            staticReportBuilder.saveStaticFiles(),
            handleTestResults(testplane as TestplaneWithHtmlReporter, staticReportBuilder)
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

async function handleTestResults(testplane: TestplaneWithHtmlReporter, reportBuilder: StaticReportBuilder): Promise<void> {
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
                    const {getStatus} = await import('./lib/adapters/test-result/testplane');
                    const {finalizeSnapshotsForTest} = await import('./lib/adapters/event-handling/testplane/snapshots');
                    const formattedResult = formatTestResult(
                        testResult,
                        getStatus(eventName, testplane.events, testResult),
                        UNKNOWN_ATTEMPT,
                        testplane.config.saveHistoryMode
                    );

                    const attachments: Attachment[] = formattedResult.attachments;
                    const attempt = reportBuilder.registerAttempt({fullName: formattedResult.fullName, browserId: formattedResult.browserId}, formattedResult.status);
                    const snapshotAttachments = await finalizeSnapshotsForTest({
                        testResult: formattedResult,
                        attempt,
                        reportPath: testplane.htmlReporter.config.path,
                        timeTravelConfig: testplane.config.timeTravel,
                        events: testplane.events,
                        eventName,
                        snapshotsSaver: testplane.htmlReporter.snapshotsSaver
                    });

                    attachments.push(...snapshotAttachments);

                    const formattedResultWithAttachments = copyAndUpdate(formattedResult, {attachments, attempt});

                    await reportBuilder.addTestResult(formattedResultWithAttachments);
                }).catch(reject));
            });
        });

        testplane.on(testplane.events.RUNNER_END, () => {
            return Promise.all(promises).then(() => resolve(), reject);
        });

        testplane.on(testplane.events.DOM_SNAPSHOTS, (context, data) => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const {handleDomSnapshotsEvent} = require('./lib/adapters/event-handling/testplane/snapshots');
            handleDomSnapshotsEvent(null, context, data);
        });
    });
}
