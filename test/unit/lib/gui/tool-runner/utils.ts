import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import Database from 'better-sqlite3';
import * as sinon from 'sinon';
import proxyquire from 'proxyquire';
import {
    DB_CURRENT_VERSION,
    DB_VERSION_TABLE_NAME,
    DB_SUITES_TABLE_NAME,
    VERSION_TABLE_COLUMNS,
    DB_COLUMNS,
    LOCAL_DATABASE_NAME
} from 'lib/constants/database';
import {getDatabaseVersion, migrateDatabase} from 'lib/db-utils/migrations';
import {mkFullTitle} from 'lib/gui/tool-runner/utils';

describe('lib/gui/tool-runner/utils', () => {
    describe('mkFullTitle', () => {
        it('should build title if array with path is not empty', () => {
            const suite = {path: ['p1', 'p2']};
            const state = {name: 'state'};

            assert.equal(mkFullTitle({suite, state}), 'p1 p2 state');
        });

        it('should build title if array with path is empty', () => {
            const suite = {path: []};
            const state = {name: 'state'};

            assert.equal(mkFullTitle({suite, state}), 'state');
        });
    });

    describe('prepareLocalDatabase', () => {
        let tempDir: string;
        let reportPath: string;
        let dbPath: string;
        let utilsWithStubs: any;
        let backupAndResetStub: sinon.SinonStub;
        let consoleWarnStub: sinon.SinonStub;

        beforeEach(async () => {
            tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'html-reporter-test-'));
            reportPath = path.join(tempDir, 'report');
            await fs.ensureDir(reportPath);
            dbPath = path.join(reportPath, LOCAL_DATABASE_NAME);

            backupAndResetStub = sinon.stub();
            consoleWarnStub = sinon.stub(console, 'warn');

            utilsWithStubs = proxyquire('lib/gui/tool-runner/utils', {
                '../../db-utils/migrations': {
                    getDatabaseVersion,
                    migrateDatabase,
                    backupAndReset: backupAndResetStub
                }
            });

            backupAndResetStub.resolves(path.join(tempDir, `report_backup_${Date.now()}`));
        });

        afterEach(async () => {
            consoleWarnStub.restore();
            await fs.remove(tempDir);
        });

        it('should do nothing if database file does not exist', async () => {
            await utilsWithStubs.prepareLocalDatabase(reportPath);

            assert.notCalled(backupAndResetStub);
            assert.notCalled(consoleWarnStub);
        });

        it('should migrate database if version is less than current', async () => {
            const db = new Database(dbPath);
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
            db.close();
            assert.isTrue(await fs.pathExists(dbPath));

            await utilsWithStubs.prepareLocalDatabase(reportPath);

            assert.notCalled(backupAndResetStub);
            assert.notCalled(consoleWarnStub);
            const dbAfter = new Database(dbPath);
            const versionTableExists = dbAfter.prepare(
                `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
            ).get(DB_VERSION_TABLE_NAME);
            dbAfter.close();
            assert.isNotNull(versionTableExists);
        });

        it('should backup and reset if database version is null', async () => {
            const db = new Database(dbPath);
            db.close();

            await utilsWithStubs.prepareLocalDatabase(reportPath);

            assert.calledOnce(backupAndResetStub);
            assert.calledWith(backupAndResetStub, reportPath);
            assert.calledOnce(consoleWarnStub);
            assert.match(consoleWarnStub.firstCall.args[0], /unknown unsupported version/);
        });

        it('should backup and reset if database version is greater than current', async () => {
            const db = new Database(dbPath);
            db.prepare(`CREATE TABLE ${DB_VERSION_TABLE_NAME} (${VERSION_TABLE_COLUMNS[0].name} INTEGER)`).run();
            db.prepare(`INSERT INTO ${DB_VERSION_TABLE_NAME} (${VERSION_TABLE_COLUMNS[0].name}) VALUES (?)`).run(DB_CURRENT_VERSION + 1);
            db.close();

            await utilsWithStubs.prepareLocalDatabase(reportPath);

            assert.calledOnce(backupAndResetStub);
            assert.calledWith(backupAndResetStub, reportPath);
            assert.calledOnce(consoleWarnStub);
            assert.match(consoleWarnStub.firstCall.args[0], /unsupported version/);
            assert.match(consoleWarnStub.firstCall.args[0], /newer version of html-reporter/);
        });

        it('should do nothing if database version equals current version', async () => {
            const db = new Database(dbPath);
            db.prepare(`CREATE TABLE ${DB_VERSION_TABLE_NAME} (${VERSION_TABLE_COLUMNS[0].name} INTEGER)`).run();
            db.prepare(`INSERT INTO ${DB_VERSION_TABLE_NAME} (${VERSION_TABLE_COLUMNS[0].name}) VALUES (?)`).run(DB_CURRENT_VERSION);
            db.close();

            await utilsWithStubs.prepareLocalDatabase(reportPath);

            assert.notCalled(backupAndResetStub);
            assert.notCalled(consoleWarnStub);
        });

        it('should close database connection even if an error occurs', async () => {
            const db = new Database(dbPath);
            db.close();
            const databaseCloseStub = sinon.stub();
            const databaseErrorStub = sinon.stub().returns({
                close: databaseCloseStub
            });
            const utilsWithErrorStub = proxyquire('lib/gui/tool-runner/utils', {
                'better-sqlite3': databaseErrorStub
            });

            await utilsWithErrorStub.prepareLocalDatabase(reportPath);

            assert.calledOnce(databaseCloseStub);
        });
    });
});
