import path from 'path';
import crypto from 'crypto';
import fs from 'fs-extra';
import type {Database} from '@gemini-testing/sql.js';
import chalk from 'chalk';
import NestedError from 'nested-error-stacks';

import {StaticTestsTreeBuilder} from '../tests-tree-builder/static';
import * as commonSqliteUtils from './common';
import {isUrl, fetchFile, normalizeUrls, logger} from '../common-utils';
import {DATABASE_URLS_JSON_NAME, DB_COLUMNS, LOCAL_DATABASE_NAME, TestStatus} from '../constants';
import {DbLoadResult, HandleDatabasesOptions} from './common';
import {DbUrlsJsonData, RawSuitesRow, ReporterConfig} from '../types';
import {Tree} from '../tests-tree-builder/base';
import {ReporterTestResult} from '../adapters/test-result';
import {SqliteClient} from '../sqlite-client';

export * from './common';

export const makeSqlDatabaseFromData = async (data: Buffer | undefined): Promise<Database & {filename: string}> => {
    const {default: initSqlJs} = await import('@gemini-testing/sql.js');

    const sqlJs = await initSqlJs();

    return new sqlJs.Database(data) as Database & {filename: string};
};

export const makeSqlDatabaseFromFile = async (dbPath: string | null): Promise<Database & {filename: string}> => {
    let data: Buffer | undefined;

    if (dbPath && fs.existsSync(dbPath)) {
        data = await fs.readFile(dbPath);
    }

    return makeSqlDatabaseFromData(data);
};

export const prepareUrls = (urls: string[], baseUrl: string): string[] => {
    return isUrl(baseUrl)
        ? normalizeUrls(urls, baseUrl)
        : urls.map(u => isUrl(u) ? u : path.join(path.parse(baseUrl).dir, u));
};

export async function downloadDatabases(dbJsonUrls: string[], opts: HandleDatabasesOptions): Promise<(string | DbLoadResult)[]> {
    const loadDbJsonUrl = async (dbJsonUrl: string): Promise<{data: DbUrlsJsonData | null}> => {
        if (isUrl(dbJsonUrl)) {
            return fetchFile(dbJsonUrl);
        }

        const data = await fs.readJSON(dbJsonUrl);
        return {data};
    };

    const loadDbUrl = (dbUrl: string, opts: HandleDatabasesOptions): Promise<string> => downloadSingleDatabase(dbUrl, opts);

    return commonSqliteUtils.handleDatabases(dbJsonUrls, {...opts, loadDbJsonUrl, prepareUrls, loadDbUrl});
}

export async function mergeDatabases(srcDbPaths: string[], reportPath: string): Promise<void> {
    try {
        const mainDatabaseUrls = path.resolve(reportPath, DATABASE_URLS_JSON_NAME);
        const mergedDbPath = path.resolve(reportPath, LOCAL_DATABASE_NAME);

        const mergedDb = await makeSqlDatabaseFromFile(mergedDbPath);

        const dbPaths = await Promise.all(srcDbPaths.map(p => makeSqlDatabaseFromFile(p).then(db => db.filename)));

        commonSqliteUtils.mergeTables({db: mergedDb, dbPaths, getExistingTables: (statement) => {
            const tables: string[] = [];
            while (statement.step()) {
                const row = statement.get();
                if (Array.isArray(row) && row.length > 0) {
                    tables.push(row[0] as string);
                }
            }
            return tables;
        }});

        for (const dbPath of srcDbPaths) {
            await fs.remove(dbPath);
        }

        await rewriteDatabaseUrls([mergedDbPath], mainDatabaseUrls, reportPath);

        await fs.writeFile(mergedDbPath, mergedDb.export());
        mergedDb.close();
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        throw new NestedError('Error while merging databases', err);
    }
}

export async function getTestRowsFromDatabase(dbPath: string): Promise<RawSuitesRow[]> {
    await fs.ensureFile(dbPath);

    const db = await makeSqlDatabaseFromFile(dbPath);

    const suitesQueryStatement = db.prepare(commonSqliteUtils.selectAllSuitesQuery());
    const suitesRows: RawSuitesRow[] = [];

    while (suitesQueryStatement.step()) {
        const row = suitesQueryStatement.get();
        if (Array.isArray(row)) {
            suitesRows.push(row as RawSuitesRow);
        }
    }
    suitesQueryStatement.free();

    db.close();

    return suitesRows;
}

export async function getTestsTreeFromDatabase(dbPath: string, baseHost: string): Promise<Tree> {
    try {
        const suitesRows = await getTestRowsFromDatabase(dbPath);

        const testsTreeBuilder = StaticTestsTreeBuilder.create({baseHost});

        const sortedRows = suitesRows.sort(commonSqliteUtils.compareDatabaseRowsByTimestamp);
        const {tree} = testsTreeBuilder.build(sortedRows);

        return tree;
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        throw new NestedError('Error while getting data from database', err);
    }
}

async function downloadSingleDatabase(dbUrl: string, {pluginConfig}: {pluginConfig: ReporterConfig}): Promise<string> {
    if (!isUrl(dbUrl)) {
        return path.resolve(pluginConfig.path, dbUrl);
    }

    const dest = path.resolve(pluginConfig.path, getUniqueFileNameForLink(dbUrl));

    logger.log(chalk.green(`Download ${dbUrl} to ${pluginConfig.path}`));

    const {default: axios} = await import('axios');
    const response = await axios({
        url: dbUrl,
        responseType: 'stream'
    });

    const writer = fs.createWriteStream(dest);

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });

    return dest;
}

function getUniqueFileNameForLink(link: string): string {
    const fileName = crypto
        .createHash('sha256')
        .update(link)
        .digest('hex');
    const fileExt = path.extname(new URL(link).pathname);

    return `${fileName}${fileExt}`;
}

async function rewriteDatabaseUrls(dbPaths: string[], mainDatabaseUrls: string, reportPath: string): Promise<void> {
    const dbUrls = dbPaths.map(p => path.relative(reportPath, p));

    await fs.writeJson(mainDatabaseUrls, {
        dbUrls,
        jsonUrls: []
    });
}

export const getTestFromDb = <T = unknown>(dbClient: SqliteClient, testResult: ReporterTestResult): T | undefined => {
    return dbClient.query<T>({
        select: '*',
        where: `${DB_COLUMNS.SUITE_PATH} = ? AND ${DB_COLUMNS.NAME} = ? AND ${DB_COLUMNS.STATUS} = ?`,
        orderBy: DB_COLUMNS.TIMESTAMP,
        orderDescending: true,
        limit: 1
    }, JSON.stringify(testResult.testPath), testResult.browserId, TestStatus.SKIPPED);
};
