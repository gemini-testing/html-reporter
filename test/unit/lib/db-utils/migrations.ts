import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import Database from 'better-sqlite3';
import {
    getDatabaseVersion,
    setDatabaseVersion,
    migrateDatabase
} from 'lib/db-utils/migrations';
import {
    DB_VERSION_TABLE_NAME,
    DB_CURRENT_VERSION,
    DB_SUITES_TABLE_NAME,
    DB_COLUMNS,
    VERSION_TABLE_COLUMNS
} from 'lib/constants/database';

describe('lib/db-utils/migrations', () => {
    let db: Database.Database;
    let tempDir: string;
    let dbPath: string;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'html-reporter-test-'));
        dbPath = path.join(tempDir, 'test.db');
        db = new Database(dbPath);
    });

    afterEach(async () => {
        db.close();
        await fs.remove(tempDir);
    });

    describe('getDatabaseVersion', () => {
        it('should return null for a new database with no tables', () => {
            const version = getDatabaseVersion(db);
            assert.isNull(version);
        });

        it('should return the correct version from version table', () => {
            db.prepare(`CREATE TABLE ${DB_VERSION_TABLE_NAME} (${VERSION_TABLE_COLUMNS[0].name} INTEGER)`).run();
            db.prepare(`INSERT INTO ${DB_VERSION_TABLE_NAME} (${VERSION_TABLE_COLUMNS[0].name}) VALUES (?)`).run(1);

            const version = getDatabaseVersion(db);

            assert.strictEqual(version, 1);
        });

        it('should detect version 0 based on table columns', () => {
            const columns = [
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
            ].join(' TEXT, ') + ' TEXT';
            db.prepare(`CREATE TABLE ${DB_SUITES_TABLE_NAME} (${columns})`).run();

            const version = getDatabaseVersion(db);

            assert.strictEqual(version, 0);
        });

        it('should detect version 1 based on table columns', () => {
            const columns = [
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
                DB_COLUMNS.DURATION,
                DB_COLUMNS.ATTACHMENTS
            ].join(' TEXT, ') + ' TEXT';
            db.prepare(`CREATE TABLE ${DB_SUITES_TABLE_NAME} (${columns})`).run();

            const version = getDatabaseVersion(db);

            assert.strictEqual(version, 1);
        });
    });

    describe('setDatabaseVersion', () => {
        it('should set the database version in the version table', () => {
            db.prepare(`CREATE TABLE ${DB_VERSION_TABLE_NAME} (${VERSION_TABLE_COLUMNS[0].name} INTEGER)`).run();

            setDatabaseVersion(db, 2);

            const versionRow = db.prepare(`SELECT ${VERSION_TABLE_COLUMNS[0].name} FROM ${DB_VERSION_TABLE_NAME}`).get() as {[key: string]: number};
            assert.strictEqual(versionRow[VERSION_TABLE_COLUMNS[0].name], 2);
        });

        it('should update the version if it already exists', () => {
            db.prepare(`CREATE TABLE ${DB_VERSION_TABLE_NAME} (${VERSION_TABLE_COLUMNS[0].name} INTEGER)`).run();
            db.prepare(`INSERT INTO ${DB_VERSION_TABLE_NAME} (${VERSION_TABLE_COLUMNS[0].name}) VALUES (?)`).run(1);

            setDatabaseVersion(db, 2);

            const versionRow = db.prepare(`SELECT ${VERSION_TABLE_COLUMNS[0].name} FROM ${DB_VERSION_TABLE_NAME}`).get() as {[key: string]: number};
            assert.strictEqual(versionRow[VERSION_TABLE_COLUMNS[0].name], 2);
        });
    });

    describe('migrateDatabase', () => {
        it('should migrate from version 0 to 1', async () => {
            const columns = [
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
            ].join(' TEXT, ') + ' TEXT';
            db.prepare(`CREATE TABLE ${DB_SUITES_TABLE_NAME} (${columns})`).run();

            const initialVersion = getDatabaseVersion(db);
            assert.strictEqual(initialVersion, 0);

            await migrateDatabase(db, 0);

            const newVersion = getDatabaseVersion(db);
            assert.strictEqual(newVersion, DB_CURRENT_VERSION);
            const tableInfo = db.prepare(`PRAGMA table_info(${DB_SUITES_TABLE_NAME})`).all() as {name: string}[];
            const columnNames = tableInfo.map(col => col.name);
            assert.include(columnNames, DB_COLUMNS.ATTACHMENTS);
            const versionTableExists = db.prepare(
                `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
            ).get(DB_VERSION_TABLE_NAME);
            assert.isNotNull(versionTableExists);
        });

        it('should throw an error for unsupported database version', async () => {
            try {
                await migrateDatabase(db, -1);
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.include((error as Error).message, 'Unsupported database version');
            }
            try {
                await migrateDatabase(db, 999);
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.include((error as Error).message, 'Unsupported database version');
            }
        });
    });
});
