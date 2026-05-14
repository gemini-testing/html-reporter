import fs from 'fs-extra';
import path from 'path';

import {
    downloadDatabases,
    makeSqlDatabaseFromFile,
    prepareUrls,
    resolveDatabaseUrlsJsonPath,
    downloadSingleDatabase
} from './db-utils/server';
import {compareDatabaseRowsByTimestamp, selectAllSuitesQuery} from './db-utils/common';
import {ReporterTestResult} from './adapters/test-result';
import {SqliteTestResultAdapter} from './adapters/test-result/sqlite';
import {RawSuitesRow} from './types';
import {DB_COLUMN_INDEXES} from './constants';
import {isUrl} from './common-utils';
import {isDbFile, writeDatabaseUrlsFile} from './server-utils';

export type {ReporterTestResult};

export type ReportFileToDownload = 'dbFiles';

export interface DownloadReportOptions {
    files?: ReportFileToDownload[];
}

export interface DownloadReportResult {
    reportPath: string;
    dbPaths: string[];
}

const DEFAULT_REPORT_FILES_TO_DOWNLOAD: ReportFileToDownload[] = ['dbFiles'];

const isString = (value: unknown): value is string => typeof value === 'string';

const resolveAttempt = (attemptsByBrowser: Map<string, number>, row: RawSuitesRow): number => {
    const testPath: string[] = JSON.parse(row[DB_COLUMN_INDEXES.suitePath] as string);
    const browserName = row[DB_COLUMN_INDEXES.name] as string;
    const browserId = [...testPath, browserName].join(' ');
    const attempt = attemptsByBrowser.has(browserId) ? (attemptsByBrowser.get(browserId) as number) + 1 : 0;

    attemptsByBrowser.set(browserId, attempt);

    return attempt;
};

const validateReportFilesToDownload = (files: ReportFileToDownload[]): void => {
    for (const file of files) {
        if (file !== 'dbFiles') {
            throw new Error(`Unsupported report file type to download: ${file}`);
        }
    }
};

const validateLocalDatabaseUrlsJson = async (dbJsonPath: string): Promise<void> => {
    const {dbUrls = [], jsonUrls = []} = await fs.readJSON(dbJsonPath);
    const preparedDbUrls = prepareUrls(dbUrls, dbJsonPath);
    const preparedDbJsonUrls = prepareUrls(jsonUrls, dbJsonPath);

    [...preparedDbUrls, ...preparedDbJsonUrls].forEach((filePathOrUrl) => {
        if (isUrl(filePathOrUrl)) {
            throw new Error(`Cannot read remote report file "${filePathOrUrl}". Use downloadReport first.`);
        }
    });

    await Promise.all(preparedDbJsonUrls.map(validateLocalDatabaseUrlsJson));
};

const downloadDbFiles = async (reportPathOrUrl: string, destPath: string): Promise<string[]> => {
    if (isDbFile(reportPathOrUrl)) {
        return [await downloadSingleDatabase(reportPathOrUrl, {
            pluginConfig: {path: destPath}
        })];
    }

    const dbJsonPathOrUrl = await resolveDatabaseUrlsJsonPath(reportPathOrUrl);
    const dbPaths = await downloadDatabases([dbJsonPathOrUrl], {
        pluginConfig: {path: destPath},
        strict: true
    });

    return dbPaths.filter(isString);
};

const resolveLocalDbPaths = async (reportPath: string): Promise<string[]> => {
    if (isUrl(reportPath)) {
        throw new Error('readResultsFromReport expects a local report path. Use downloadReport first for remote reports.');
    }

    if (isDbFile(reportPath)) {
        return [path.resolve(reportPath)];
    }

    const dbJsonPath = await resolveDatabaseUrlsJsonPath(reportPath);

    await validateLocalDatabaseUrlsJson(dbJsonPath);

    const dbPaths = await downloadDatabases([dbJsonPath], {
        pluginConfig: {path: path.dirname(dbJsonPath)},
        strict: true
    });

    return dbPaths.filter(isString);
};

export const downloadReport = async (
    reportPathOrUrl: string,
    destPath: string,
    options: DownloadReportOptions = {}
): Promise<DownloadReportResult> => {
    const files = options.files ?? DEFAULT_REPORT_FILES_TO_DOWNLOAD;

    validateReportFilesToDownload(files);

    if (!isUrl(reportPathOrUrl)) {
        throw new Error('downloadReport expects a remote report path or URL. Use readResultsFromReport directly for local reports.');
    }

    await fs.ensureDir(destPath);

    const dbPaths = files.includes('dbFiles') ? await downloadDbFiles(reportPathOrUrl, destPath) : [];

    if (files.includes('dbFiles')) {
        await writeDatabaseUrlsFile(destPath, dbPaths.map(dbPath => path.relative(destPath, dbPath)));
    }

    return {
        reportPath: destPath,
        dbPaths
    };
};

export const readResultsFromReport = async (reportPath: string): Promise<ReporterTestResult[]> => {
    const dbPaths = await resolveLocalDbPaths(reportPath);
    const rows: RawSuitesRow[] = [];
    const attemptsByBrowser = new Map<string, number>();
    const results: ReporterTestResult[] = [];

    for (const dbPath of dbPaths) {
        const db = await makeSqlDatabaseFromFile(dbPath);
        const statement = db.prepare(selectAllSuitesQuery());

        while (statement.step()) {
            rows.push(statement.get() as RawSuitesRow);
        }

        statement.free();
        db.close();
    }

    for (const row of rows.sort(compareDatabaseRowsByTimestamp)) {
        const attempt = resolveAttempt(attemptsByBrowser, row);

        results.push(new SqliteTestResultAdapter(row, attempt));
    }

    return results;
};
