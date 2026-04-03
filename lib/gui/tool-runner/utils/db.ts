import path from 'path';

import type {Statement} from '@gemini-testing/sql.js';
import makeDebug from 'debug';
import fs from 'fs-extra';
import chalk from 'chalk';

import {logger} from '../../../common-utils';
import {DATABASE_URLS_JSON_NAME, DB_CURRENT_VERSION, LOCAL_DATABASE_NAME} from '../../../constants';
import {makeSqlDatabaseFromFile, mergeTables} from '../../../db-utils/server';
import {backupAndReset, getDatabaseVersion, migrateDatabase} from '../../../db-utils/migrations';

const debug = makeDebug('html-reporter:gui:tool-runner:utils:db');

export const mergeDatabasesForReuse = async (reportPath: string): Promise<void> => {
    const dbUrlsJsonPath = path.resolve(reportPath, DATABASE_URLS_JSON_NAME);
    const mergedDbPath = path.resolve(reportPath, LOCAL_DATABASE_NAME);

    if (!await fs.pathExists(dbUrlsJsonPath)) {
        return;
    }

    const {dbUrls = []}: {dbUrls: string[]} = await fs.readJson(dbUrlsJsonPath);

    const extraDbPaths = dbUrls
        .filter(u => u !== LOCAL_DATABASE_NAME)
        .map(u => path.resolve(reportPath, u));

    if (!extraDbPaths.length) {
        return;
    }

    logger.warn(chalk.yellow(`Merge databases to ${LOCAL_DATABASE_NAME}`));

    const mergedDatabase = await makeSqlDatabaseFromFile(mergedDbPath);

    const dbPaths = await Promise.all(extraDbPaths.map(p => makeSqlDatabaseFromFile(p).then(db => db.filename)));

    mergeTables({
        db: mergedDatabase,
        dbPaths,
        getExistingTables: (statement: Statement) => {
            const tables: string[] = [];
            while (statement.step()) {
                const row = statement.get();
                if (Array.isArray(row) && row.length > 0) {
                    tables.push(row[0] as string);
                }
            }
            return tables;
        }
    });

    const data = mergedDatabase.export();
    await fs.writeFile(mergedDbPath, data);
    mergedDatabase.close();

    await Promise.all(extraDbPaths.map(p => fs.remove(p)));
};

export const prepareLocalDatabase = async (reportPath: string): Promise<void> => {
    debug('prepareLocalDatabase', reportPath);
    const dbPath = path.resolve(reportPath, LOCAL_DATABASE_NAME);

    if (!fs.existsSync(dbPath)) {
        return;
    }

    const db = await makeSqlDatabaseFromFile(dbPath);

    try {
        const version = getDatabaseVersion(db);
        debug('determined db version', version);

        if (version !== null && version < DB_CURRENT_VERSION) {
            await migrateDatabase(db, version);
            await fs.writeFile(dbPath, db.export());
        } else if (version === null) {
            const backupPath = await backupAndReset(reportPath);
            console.warn(`SQLite db at ${dbPath} is of unknown unsupported version.\nBacked up to ${backupPath} and starting from scratch.`);
        } else if (version > DB_CURRENT_VERSION) {
            const backupPath = await backupAndReset(reportPath);
            console.warn(`SQLite db at ${dbPath} is of unsupported version. ` +
                'This probably happened because the report was generated with a newer version of html-reporter than you are trying to use now. ' +
                'Please update html-reporter to the latest version to open this report.\n' +
                `Backed up to ${backupPath} and starting from scratch.`);
        }
    } finally {
        db.close();
    }
};
