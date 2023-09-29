import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import fs from 'fs-extra';
import Database from 'better-sqlite3';
import chalk from 'chalk';
import NestedError from 'nested-error-stacks';

import {StaticTestsTreeBuilder} from '../tests-tree-builder/static';
import * as commonSqliteUtils from './common';
import {isUrl, fetchFile, normalizeUrls, logger} from '../common-utils';
import {DATABASE_URLS_JSON_NAME, DB_COLUMNS, LOCAL_DATABASE_NAME, TestStatus, ToolName} from '../constants';
import {DbLoadResult, HandleDatabasesOptions} from './common';
import {DbUrlsJsonData, RawSuitesRow, ReporterConfig} from '../types';
import {Tree} from '../tests-tree-builder/base';
import {ReporterTestResult} from '../test-adapter';
import {SqliteAdapter} from '../sqlite-adapter';

export * from './common';

export const prepareUrls = (urls: string[], baseUrl: string): string[] => isUrl(baseUrl) ? normalizeUrls(urls, baseUrl) : urls;

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
        const mergedDb = new Database(mergedDbPath);

        commonSqliteUtils.mergeTables({db: mergedDb, dbPaths: srcDbPaths, getExistingTables: (statement) => {
            return statement.all().map((table) => (table as {name: string}).name);
        }});

        for (const dbPath of srcDbPaths) {
            await fs.remove(dbPath);
        }

        await rewriteDatabaseUrls([mergedDbPath], mainDatabaseUrls, reportPath);

        mergedDb.close();
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        throw new NestedError('Error while merging databases', err);
    }
}

export function getTestsTreeFromDatabase(toolName: ToolName, dbPath: string): Tree {
    try {
        const db = new Database(dbPath, {readonly: true, fileMustExist: true});
        const testsTreeBuilder = StaticTestsTreeBuilder.create({toolName});

        const suitesRows = (db.prepare(commonSqliteUtils.selectAllSuitesQuery())
            .raw()
            .all() as RawSuitesRow[])
            .sort(commonSqliteUtils.compareDatabaseRowsByTimestamp);
        const {tree} = testsTreeBuilder.build(suitesRows);

        db.close();

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

export const getTestFromDb = <T = unknown>(sqliteAdapter: SqliteAdapter, testResult: ReporterTestResult): T | undefined => {
    return sqliteAdapter.query<T>({
        select: '*',
        where: `${DB_COLUMNS.SUITE_PATH} = ? AND ${DB_COLUMNS.NAME} = ? AND ${DB_COLUMNS.STATUS} = ?`,
        orderBy: DB_COLUMNS.TIMESTAMP,
        orderDescending: true,
        limit: 1
    }, JSON.stringify(testResult.testPath), testResult.browserId, TestStatus.SKIPPED);
};
