import fs from 'fs-extra';
import makeDebug from 'debug';
import Database from 'better-sqlite3';
import {
    DB_VERSION_TABLE_NAME,
    DB_CURRENT_VERSION,
    DB_SUITES_TABLE_NAME,
    DB_COLUMNS,
    VERSION_TABLE_COLUMNS,
    LabeledVersionRow
} from '../constants/database';
import {isEqual} from 'lodash';

const debug = makeDebug('html-reporter:db-migrations');

export const getDatabaseVersion = (db: Database.Database): number | null => {
    try {
        const versionTableExists = db.prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
        ).get(DB_VERSION_TABLE_NAME);

        if (!versionTableExists) {
            const tableInfo = db.prepare(`PRAGMA table_info(${DB_SUITES_TABLE_NAME})`).all() as {name: string}[];
            const columnNames = tableInfo.map(col => col.name);

            const version0Columns = [
                DB_COLUMNS.SUITE_PATH,
                DB_COLUMNS.SUITE_NAME,
                DB_COLUMNS.NAME,
                DB_COLUMNS.SUITE_URL,
                DB_COLUMNS.META_INFO,
                DB_COLUMNS.HISTORY,
                DB_COLUMNS.DESCRIPTION,
                DB_COLUMNS.ERROR,
                DB_COLUMNS.SKIP_REASON,
                DB_COLUMNS.IMAGES_INFO,
                DB_COLUMNS.SCREENSHOT,
                DB_COLUMNS.MULTIPLE_TABS,
                DB_COLUMNS.STATUS,
                DB_COLUMNS.TIMESTAMP,
                DB_COLUMNS.DURATION
            ];

            if (isEqual(columnNames, version0Columns)) {
                return 0;
            }

            return null;
        }

        const versionRow = db.prepare(`SELECT ${VERSION_TABLE_COLUMNS[0].name} FROM ${DB_VERSION_TABLE_NAME} LIMIT 1`).get() as LabeledVersionRow;
        if (!versionRow) {
            return null;
        }

        const version = Number(versionRow[VERSION_TABLE_COLUMNS[0].name]);
        return isNaN(version) || version < 0 ? null : version;
    } catch (error) {
        debug(`Error getting database version: ${error}`);
        return null;
    }
};

export const setDatabaseVersion = (db: Database.Database, version: number): void => {
    db.prepare(`DELETE FROM ${DB_VERSION_TABLE_NAME}`).run();
    db.prepare(`INSERT INTO ${DB_VERSION_TABLE_NAME} (${VERSION_TABLE_COLUMNS[0].name}) VALUES (?)`).run(version);
};

/**
 * Migration from version 0 to version 1
 * - Adds attachments column to suites table
 */
const migrateV0ToV1 = (db: Database.Database): void => {
    db.prepare(`ALTER TABLE ${DB_SUITES_TABLE_NAME} ADD COLUMN ${DB_COLUMNS.ATTACHMENTS} TEXT DEFAULT '[]'`).run();
};

export const migrateDatabase = async (db: Database.Database, version: number): Promise<void> => {
    const migrations = [
        migrateV0ToV1
    ];

    try {
        if (version < 0 || version >= migrations.length) {
            throw new Error(`Unsupported database version encountered. Try deleting your report directory and restarting html-reporter.`);
        }

        for (const migration of migrations.slice(version)) {
            migration(db);
        }

        setDatabaseVersion(db, DB_CURRENT_VERSION);
    } catch (error) {
        debug(`Error during database migration: ${error}`);
        throw error;
    }
};

export const backupAndReset = async (reportPath: string): Promise<string> => {
    const timestamp = Date.now();
    const backupDir = `${reportPath}_backup_${timestamp}`;
    debug(`Creating backup of corrupted database at: ${backupDir}`);

    await fs.move(reportPath, backupDir);

    return backupDir;
};
