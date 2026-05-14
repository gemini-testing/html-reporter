import _ from 'lodash';
import {logger} from '../common-utils';
import {DB_MAX_AVAILABLE_PAGE_SIZE, DB_SUITES_TABLE_NAME, SUITES_TABLE_COLUMNS, DB_COLUMN_INDEXES, DB_VERSION_TABLE_NAME, VERSION_TABLE_COLUMNS} from '../constants';
import type {DbUrlsJsonData, RawSuitesRow, ReporterConfig} from '../types';
import type {Database as SqlJsDatabase, Statement} from '@gemini-testing/sql.js';
import type {ReadonlyDeep} from 'type-fest';

export const selectAllQuery = (tableName: string): string => `SELECT * FROM ${tableName}`;
export const selectAllSuitesQuery = (): string => selectAllQuery(DB_SUITES_TABLE_NAME);

export const createTablesQuery = (): string[] => [
    createTableQuery(DB_SUITES_TABLE_NAME, SUITES_TABLE_COLUMNS),
    createTableQuery(DB_VERSION_TABLE_NAME, VERSION_TABLE_COLUMNS)
];

export const compareDatabaseRowsByTimestamp = (row1: RawSuitesRow, row2: RawSuitesRow): number => {
    return (row1[DB_COLUMN_INDEXES.timestamp] as number) - (row2[DB_COLUMN_INDEXES.timestamp] as number);
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Database {}

export interface DbLoadResult {
    url: string; status: string; data: null | unknown
}

export interface DbDetails {
    url: string;
    status: string;
    success: boolean;
}

type DbJsonLoadResult = {data: DbUrlsJsonData | null; status?: string; error?: unknown};

export interface HandleDatabasesOptions {
    pluginConfig: Pick<ReporterConfig, 'path'>;
    strict?: boolean;
    loadDbJsonUrl: (dbJsonUrl: string) => Promise<DbJsonLoadResult>;
    formatData?: (dbJsonUrl: string, status?: string) => DbLoadResult;
    prepareUrls: (dbUrls: string[], baseUrls: string) => string[];
    loadDbUrl: (dbUrl: string, opts: HandleDatabasesOptions) => Promise<DbLoadResult | string>;
}

export const makeFileDownloadErrorMessage = (fileUrl: string, error: unknown, requestStatus?: string): string => {
    const REMOTE_REPORT_DOWNLOAD_HINT = 'Check that the URL is correct and can be accessed without authentication (authentication during download is not available yet). Alternatively, you can download the report manually first before working with it.';

    let reason: string;
    if (error instanceof Error && error.message) {
        reason = error.message;
    } else if (error && typeof error !== 'object') {
        reason = String(error);
    } else {
        reason = requestStatus ? `request failed with status ${requestStatus}` : 'unknown error';
    }

    return [
        `Cannot download file from "${fileUrl}".`,
        `Reason: ${reason}.`,
        REMOTE_REPORT_DOWNLOAD_HINT
    ].join('\n');
};

export const handleDatabases = async (dbJsonUrls: string[], opts: HandleDatabasesOptions): Promise<(string | DbLoadResult)[]> => {
    return _.flattenDeep(
        await Promise.all(
            dbJsonUrls.map(async dbJsonUrl => {
                try {
                    const currentJsonResponse = await opts.loadDbJsonUrl(dbJsonUrl);

                    if (!currentJsonResponse.data) {
                        const message = makeFileDownloadErrorMessage(dbJsonUrl, currentJsonResponse.error, currentJsonResponse.status);

                        if (opts.strict) {
                            throw new Error(message);
                        }

                        logger.warn(message);

                        return opts.formatData ? opts.formatData(dbJsonUrl, currentJsonResponse.status) : [];
                    }

                    const {dbUrls, jsonUrls} = currentJsonResponse.data;
                    const preparedDbUrls = opts.prepareUrls(dbUrls, dbJsonUrl);
                    const preparedDbJsonUrls = opts.prepareUrls(jsonUrls, dbJsonUrl);

                    return await Promise.all([
                        handleDatabases(preparedDbJsonUrls, opts),
                        ...preparedDbUrls.map((dbUrl: string) => opts.loadDbUrl(dbUrl, opts))
                    ]);
                } catch (e) {
                    if (opts.strict) {
                        throw e;
                    }

                    logger.warn(`Error while downloading databases from ${dbJsonUrl}`, e);

                    return opts.formatData ? opts.formatData(dbJsonUrl) : [];
                }
            })
        )
    );
};

export const mergeTables = ({db, dbPaths, getExistingTables = (): string[] => []}: { db: SqlJsDatabase, dbPaths: string[], getExistingTables?: (getTablesStatement: Statement) => string[] }): void => {
    db.run(`PRAGMA page_size = ${DB_MAX_AVAILABLE_PAGE_SIZE}`);

    for (const dbPath of dbPaths) {
        db.run(`ATTACH DATABASE '${dbPath}' AS attached`);

        const getTablesStatement = db.prepare(`SELECT name FROM attached.sqlite_master WHERE type='table'`);
        const tables = getExistingTables(getTablesStatement);
        getTablesStatement.free();

        for (const tableName of tables) {
            db.run(`CREATE TABLE IF NOT EXISTS ${tableName} AS SELECT * FROM attached.${tableName} LIMIT 0`);
            db.run(`INSERT OR IGNORE INTO ${tableName} SELECT * FROM attached.${tableName}`);
        }

        db.run(`DETACH attached`);
    }
};

export function createTableQuery(tableName: string, columns: ReadonlyDeep<{name: string, type: string }[]>): string {
    const formattedColumns = columns
        .map(({name, type}) => `${name} ${type}`)
        .join(', ');

    return `CREATE TABLE IF NOT EXISTS ${tableName} (${formattedColumns})`;
}
