import _ from 'lodash';
import {logger} from '../common-utils';
import {DB_MAX_AVAILABLE_PAGE_SIZE, DB_SUITES_TABLE_NAME, SUITES_TABLE_COLUMNS, DB_COLUMN_INDEXES} from '../constants';
import {DbUrlsJsonData, RawSuitesRow, ReporterConfig} from '../types';
import type {Database, Statement} from 'better-sqlite3';
import {ReadonlyDeep} from 'type-fest';

export const selectAllQuery = (tableName: string): string => `SELECT * FROM ${tableName}`;
export const selectAllSuitesQuery = (): string => selectAllQuery(DB_SUITES_TABLE_NAME);

export const createTablesQuery = (): string[] => [
    createTableQuery(DB_SUITES_TABLE_NAME, SUITES_TABLE_COLUMNS)
];

export const compareDatabaseRowsByTimestamp = (row1: RawSuitesRow, row2: RawSuitesRow): number => {
    return (row1[DB_COLUMN_INDEXES.timestamp] as number) - (row2[DB_COLUMN_INDEXES.timestamp] as number);
};

export interface DbLoadResult {
    url: string; status: string; data: null | unknown
}

export interface HandleDatabasesOptions {
    pluginConfig: ReporterConfig;
    loadDbJsonUrl: (dbJsonUrl: string) => Promise<{data: DbUrlsJsonData | null; status?: string}>;
    formatData?: (dbJsonUrl: string, status?: string) => DbLoadResult;
    prepareUrls: (dbUrls: string[], baseUrls: string) => string[];
    loadDbUrl: (dbUrl: string, opts: HandleDatabasesOptions) => Promise<DbLoadResult | string>;
}

export const handleDatabases = async (dbJsonUrls: string[], opts: HandleDatabasesOptions): Promise<(string | DbLoadResult)[]> => {
    return _.flattenDeep(
        await Promise.all(
            dbJsonUrls.map(async dbJsonUrl => {
                try {
                    const currentJsonResponse = await opts.loadDbJsonUrl(dbJsonUrl);

                    if (!currentJsonResponse.data) {
                        logger.warn(`Cannot get data from ${dbJsonUrl}`);

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
                    logger.warn(`Error while downloading databases from ${dbJsonUrl}`, e);

                    return opts.formatData ? opts.formatData(dbJsonUrl) : [];
                }
            })
        )
    );
};

export const mergeTables = ({db, dbPaths, getExistingTables = (): string[] => []}: { db: Database, dbPaths: string[], getExistingTables?: (getTablesStatement: Statement<[]>) => string[] }): void => {
    db.prepare(`PRAGMA page_size = ${DB_MAX_AVAILABLE_PAGE_SIZE}`).run();

    for (const dbPath of dbPaths) {
        db.prepare(`ATTACH DATABASE '${dbPath}' AS attached`).run();

        const getTablesStatement = db.prepare<[]>(`SELECT name FROM attached.sqlite_master WHERE type='table'`);
        const tables = getExistingTables(getTablesStatement);

        for (const tableName of tables) {
            db.prepare(`CREATE TABLE IF NOT EXISTS ${tableName} AS SELECT * FROM attached.${tableName} LIMIT 0`).run();
            db.prepare(`INSERT OR IGNORE INTO ${tableName} SELECT * FROM attached.${tableName}`).run();
        }

        db.prepare(`DETACH attached`).run();
    }
};

function createTableQuery(tableName: string, columns: ReadonlyDeep<{name: string, type: string }[]>): string {
    const formattedColumns = columns
        .map(({name, type}) => `${name} ${type}`)
        .join(', ');

    return `CREATE TABLE IF NOT EXISTS ${tableName} (${formattedColumns})`;
}
