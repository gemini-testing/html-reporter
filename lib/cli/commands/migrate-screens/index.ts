import path from 'path';

import type {Command} from '@gemini-testing/commander';
import os from 'node:os';
import fs from 'fs-extra';
import PQueue from 'p-queue';
import {
    DB_COLUMN_INDEXES,
    DEFAULT_TITLE_DELIMITER,
    LOCAL_DATABASE_NAME,
    TestStatus,
    ToolName,
    UNKNOWN_ATTEMPT
} from '../../../constants';
import type {ToolAdapter} from '../../../adapters/tool';
import {cliCommands} from '../';
import {mergeDatabasesForReuse, prepareLocalDatabase} from '../../../gui/tool-runner/utils';
import {Cache} from '../../../cache';
import {GuiReportBuilder} from '../../../report-builder/gui';
import {SqliteClient} from '../../../sqlite-client';
import {SqliteImageStore} from '../../../image-store';
import {ImagesInfoSaver} from '../../../images-info-saver';
import {getExpectedCacheKey} from '../../../server-utils';
import {getTestRowsFromDatabase, getTestsTreeFromDatabase} from '../../../db-utils/server';
import {SqliteTestResultAdapter} from '../../../adapters/test-result/sqlite';
import * as commonSqliteUtils from '../../../db-utils/common';
import {ImageInfoDiff, ImageInfoFull} from '../../../types';
import type {ReporterTestResult} from '../../../adapters/test-result';
import {TestplaneConfigAdapter} from '../../../adapters/config/testplane';
import {isDiffDueToPixelRoundingChanges} from './diff-causes/pixel-rounding-changes';
import {LooksSameOptions, TimingStats, RefPathMap} from './types';
import {createCliUi} from './cli-ui';
import {copyAndUpdate} from '../../../adapters/test-result/utils';
import {downloadAndResolveImagePaths} from './utils';

const {MIGRATE_SCREENS: commandName} = cliCommands;

const collect = (newValue: string, array: string[] = []): string[] => {
    return array.concat(newValue);
};

const parseRefPathMaps = (values: string[]): RefPathMap[] => {
    return values.map((value) => {
        const [from, to] = value.split('=');
        if (!from || to === undefined) {
            throw new Error(`Invalid --ref-path-map value: "${value}". Expected "<from>=<to>"`);
        }
        return {from, to};
    });
};

export = (program: Command, toolAdapter: ToolAdapter): void => {
    program
        .command(`${commandName}`)
        .description('Auto-accept screenshot diffs caused by the new visual checks algorithms and assertView command changes in Testplane v9.\n\n' +
            'Note: this command is only available for Testplane.\n' +
            'How this works:\n' +
            '- You run all your tests with Testplane v9 and get HTML report with diffs\n' +
            `- When you run the ${commandName} command, it opens a report in path, specified in the 'path' parameter of html-reporter plugin in your Testplane config\n` +
            '- This command iterates over all the diffs in the report and if a diff is caused by the assertView command changes, it auto-accepts it\n' +
            '- You can then view what has changed in HTML Reporter GUI mode'
        )
        .option('--ref-path-map <from>=<to>', 'map invalid absolute ref paths to local paths (can be specified multiple times)', collect, [])
        .action(async (options: {refPathMap?: string[]}) => {
            await migrateScreens({
                toolAdapter,
                refPathMaps: parseRefPathMaps(options.refPathMap ?? [])
            });
        });
};

interface MigrateScreensOptions {
    toolAdapter: ToolAdapter;
    refPathMaps: RefPathMap[];
}

const isAutoAcceptableDiff = async (
    imageInfo: ImageInfoDiff,
    {compareOpts, reportPath, stats}: {compareOpts: LooksSameOptions; reportPath: string; stats: TimingStats}
): Promise<boolean> => {
    return isDiffDueToPixelRoundingChanges(imageInfo, {compareOpts, reportPath, stats});
};

async function migrateScreens({toolAdapter, refPathMaps}: MigrateScreensOptions): Promise<void> {
    if (toolAdapter.toolName !== ToolName.Testplane) {
        throw new Error(`CLI command "${commandName}" supports only "${ToolName.Testplane}" tool`);
    }

    const reportPath = toolAdapter.reporterConfig.path;
    const dbPath = path.resolve(reportPath, LOCAL_DATABASE_NAME);
    const logTimestamp = Date.now();
    const logFileName = `testplane-migrate-screens-${logTimestamp}-err.log`;
    let logStream: fs.WriteStream | null = null;
    const ui = createCliUi(0, {
        onStderr: (text) => {
            if (!logStream) {
                logStream = fs.createWriteStream(logFileName, {flags: 'a'});
            }
            logStream.write(`[stderr] ${text}`);
        }
    });
    ui.start();

    let reportBuilder: GuiReportBuilder;
    let testRows: Awaited<ReturnType<typeof getTestRowsFromDatabase>>;
    try {
        await mergeDatabasesForReuse(reportPath);
        await prepareLocalDatabase(reportPath);

        const dbClient = await SqliteClient.create({htmlReporter: toolAdapter.htmlReporter, reportPath, reuse: true});
        const imageStore = new SqliteImageStore(dbClient);

        const imagesInfoSaver = new ImagesInfoSaver({
            imageFileSaver: toolAdapter.htmlReporter.imagesSaver,
            expectedPathsCache: new Cache(getExpectedCacheKey),
            imageStore,
            reportPath
        });

        reportBuilder = GuiReportBuilder.create({
            htmlReporter: toolAdapter.htmlReporter,
            reporterConfig: toolAdapter.reporterConfig,
            dbClient,
            imagesInfoSaver
        });
        const testsTree = await getTestsTreeFromDatabase(dbPath, toolAdapter.reporterConfig.baseHost);
        reportBuilder.reuseTestsTree(testsTree, {force: true});

        testRows = await getTestRowsFromDatabase(dbPath);
    } catch (err) {
        const formatDbError = (err: unknown): string => err instanceof Error ? err.stack || err.message : String(err);
        ui.fail(
            `Failed to read report database at "${dbPath}".\n` +
            'Make sure the report directory exists and contains database files.\n' +
            `Details: ${formatDbError(err)}`
        );
        process.exitCode = 1;
        return;
    }
    const sortedRows = testRows.sort(commonSqliteUtils.compareDatabaseRowsByTimestamp);
    const testResultsMap = new Map<string, ReporterTestResult>();
    sortedRows.forEach(row => {
        const fullName = (JSON.parse(row[DB_COLUMN_INDEXES.suitePath]) as string[]).join(DEFAULT_TITLE_DELIMITER);
        const browserId = row[DB_COLUMN_INDEXES.name];

        const attempt = reportBuilder.getLatestAttempt({fullName, browserId});

        const result = new SqliteTestResultAdapter(row, attempt);

        testResultsMap.set(result.id, result);
    });

    const testResults = Array.from(testResultsMap.values()).filter(testResult => testResult.status === TestStatus.FAIL);

    let autoAccepted = 0;
    let started = 0;
    let completed = 0;
    let errorCount = 0;
    let isClosingLogStream = false;
    const timing: TimingStats = {
        startedAt: Date.now(),
        downloadMs: 0,
        compareMs: 0,
        downloads: 0,
        comparisons: 0
    };

    const queue = new PQueue({concurrency: os.cpus().length});
    ui.updateStatus({processed: 0, total: testResults.length, currentId: '—', failed: errorCount, failedLogName: logFileName});
    ui.updateStatus({failed: errorCount, failedLogName: logFileName});

    testResults.forEach((testResult) => {
        queue.add(async () => {
            const current = started + 1;
            started = current;

            try {
                ui.updateStatus({processed: completed, total: testResults.length, currentId: testResult.id, failed: errorCount, failedLogName: logFileName});

                const browserConfig = (toolAdapter.config as TestplaneConfigAdapter).getBrowserConfig(testResult.browserId);
                const compareOpts: LooksSameOptions = {
                    tolerance: browserConfig.tolerance,
                    antialiasingTolerance: browserConfig.antialiasingTolerance,
                    ...browserConfig.compareOpts,
                    ...browserConfig.buildDiffOpts,
                    stopOnFirstFail: true,
                    shouldCluster: false
                };

                const imagesInfo: ImageInfoFull[] = [];
                for (const imageInfo of testResult.imagesInfo) {
                    if (imageInfo.status !== TestStatus.FAIL || !(imageInfo as ImageInfoDiff).diffImg) {
                        continue;
                    }

                    const isAcceptable = await isAutoAcceptableDiff(imageInfo, {compareOpts, reportPath, stats: timing});
                    if (!isAcceptable) {
                        continue;
                    }

                    imagesInfo.push({...imageInfo, status: TestStatus.UPDATED} as ImageInfoFull);
                }

                if (imagesInfo.length === 0) {
                    return;
                }

                const normalizedImagesInfo = await downloadAndResolveImagePaths(imagesInfo, reportPath, timing, refPathMaps, process.cwd());
                autoAccepted += 1;
                return;
                const updatedResult = copyAndUpdate(testResult, {imagesInfo: normalizedImagesInfo, status: TestStatus.UPDATED, attempt: UNKNOWN_ATTEMPT, timestamp: Date.now()});
                await reportBuilder.updateReferenceImages(updatedResult, () => {});
            } catch (err) {
                const error = err as Error;
                const message = error.stack || error.message || String(err);
                const entry = `[${testResult.id}] ${message}\n`;
                errorCount += 1;
                ui.updateStatus({processed: completed, total: testResults.length, currentId: testResult.id, failed: errorCount, failedLogName: logFileName});
                if (!logStream) {
                    logStream = fs.createWriteStream(logFileName, {flags: 'a'});
                }
                logStream.write(entry);
            } finally {
                completed += 1;
                ui.updateStatus({processed: completed, total: testResults.length, currentId: testResult.id, failed: errorCount, failedLogName: logFileName});
            }
        });
    });

    const closeLogStream = async (): Promise<void> => {
        if (!logStream || isClosingLogStream) {
            return;
        }
        isClosingLogStream = true;
        await new Promise<void>((resolve) => {
            logStream?.end(() => resolve());
        });
    };

    await queue.onIdle();
    await closeLogStream();

    let warningMessage: string | undefined;
    if (errorCount > 0) {
        warningMessage = `Failed to migrate ${errorCount} screenshots. See details in ${logFileName}`;
        process.exitCode = 1;
    }

    ui.finish({
        processed: completed,
        autoAccepted,
        elapsedMs: Date.now() - timing.startedAt,
        downloadMs: timing.downloadMs,
        compareMs: timing.compareMs,
        warningMessage
    });

    await reportBuilder.finalize();
}
