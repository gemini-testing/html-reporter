'use strict';

const fs = require('fs-extra');
const proxyquire = require('proxyquire');

const {SqliteClient} = require('lib/sqlite-client');
const {HtmlReporter} = require('lib/plugin-api');
const {makeSqlDatabaseFromFile} = require('lib/db-utils/server');

describe('lib/sqlite-client', () => {
    const sandbox = sinon.createSandbox();
    let htmlReporter;

    const makeSqliteClient_ = async () => {
        return SqliteClient.create({htmlReporter, reportPath: 'test'});
    };

    beforeEach(() => {
        htmlReporter = HtmlReporter.create({baseHost: 'some-host'});
    });

    afterEach(() => {
        if (fs.existsSync('test/sqlite.db')) {
            fs.unlinkSync('test/sqlite.db');
        }
        sandbox.restore();
    });

    it('should create database', async () => {
        const client = await makeSqliteClient_();
        await client.close();

        assert.equal(fs.existsSync('test/sqlite.db'), true);
    });

    it('should create database with correct structure', async () => {
        const client = await makeSqliteClient_();
        await client.close();
        const db = await makeSqlDatabaseFromFile('test/sqlite.db');
        const tableStructure = [
            {cid: 0, name: 'suitePath', type: 'TEXT'},
            {cid: 1, name: 'suiteName', type: 'TEXT'},
            {cid: 2, name: 'name', type: 'TEXT'},
            {cid: 3, name: 'suiteUrl', type: 'TEXT'},
            {cid: 4, name: 'metaInfo', type: 'TEXT'},
            {cid: 5, name: 'history', type: 'TEXT'},
            {cid: 6, name: 'description', type: 'TEXT'},
            {cid: 7, name: 'error', type: 'TEXT'},
            {cid: 8, name: 'skipReason', type: 'TEXT'},
            {cid: 9, name: 'imagesInfo', type: 'TEXT'},
            {cid: 10, name: 'screenshot', type: 'INT'},
            {cid: 11, name: 'multipleTabs', type: 'INT'},
            {cid: 12, name: 'status', type: 'TEXT'},
            {cid: 13, name: 'timestamp', type: 'INT'},
            {cid: 14, name: 'duration', type: 'INT'},
            {cid: 15, name: 'attachments', type: 'TEXT'}
        ];

        const stmt = db.prepare('PRAGMA table_info(suites);');
        const columns = [];
        while (stmt.step()) {
            const row = stmt.get();
            if (Array.isArray(row)) {
                columns.push({
                    cid: row[0],
                    name: row[1],
                    type: row[2]
                });
            }
        }
        stmt.free();
        db.close();

        columns.map((column, index) => {
            assert.match(column.cid, tableStructure[index].cid);
            assert.match(column.name, tableStructure[index].name);
            assert.match(column.type, tableStructure[index].type);
        });
    });

    it('should read history only for selected tests', async () => {
        const client = await makeSqliteClient_();
        const db = client.getRawConnection();
        const placeholders = Array(16).fill('?').join(', ');
        const mkRow = (suitePath, browserId, timestamp) => [
            JSON.stringify(suitePath), suitePath.at(-1), browserId, '', '{}', '[]', null, null,
            null, '[]', 0, 0, 'success', timestamp, 0, '[]'
        ];

        db.run(`INSERT INTO suites VALUES (${placeholders})`, mkRow(['suite', 'first'], 'chrome', 2));
        db.run(`INSERT INTO suites VALUES (${placeholders})`, mkRow(['suite', 'second'], 'chrome', 1));
        db.run(`INSERT INTO suites VALUES (${placeholders})`, mkRow(['suite', 'first'], 'chrome', 3));
        db.run(`INSERT INTO suites VALUES (${placeholders})`, mkRow(['suite', 'other'], 'chrome', 0));
        const prepare = sandbox.spy(db, 'prepare');

        const rows = client.getSuitesByTests([
            {suitePath: ['suite', 'first'], browserId: 'chrome'},
            {suitePath: ['suite', 'second'], browserId: 'chrome'}
        ]);

        assert.lengthOf(rows, 3);
        assert.equal(rows[0][0], JSON.stringify(['suite', 'second']));
        assert.equal(rows[0][13], 1);
        assert.equal(rows[2][13], 3);
        assert.calledOnceWith(prepare, 'SELECT * FROM suites');
        client.close();
    });

    it('should not scan suites when no tests are requested', async () => {
        const client = await makeSqliteClient_();
        const db = client.getRawConnection();
        const prepare = sandbox.spy(db, 'prepare');

        assert.deepEqual(client.getSuitesByTests([]), []);
        assert.notCalled(prepare);
        client.close();
    });

    describe('query', () => {
        let getAsObjectStub, prepareStub, freeStub, sqliteClient;

        beforeEach(async () => {
            getAsObjectStub = sandbox.stub().returns({foo: 'bar'});
            freeStub = sandbox.stub();
            prepareStub = sandbox.stub().returns({getAsObject: getAsObjectStub, free: freeStub, run: sandbox.stub()});

            const mockDb = {
                prepare: prepareStub,
                run: sandbox.stub(),
                close: sandbox.stub(),
                export: sandbox.stub().returns(Buffer.from('mock'))
            };

            sqliteClient = await proxyquire('lib/sqlite-client', {
                './db-utils/common': {createTablesQuery: () => ['CREATE TABLE suites (id INTEGER)']},
                './db-utils/server': {
                    makeSqlDatabaseFromFile: sandbox.stub().resolves(mockDb)
                }
            }).SqliteClient.create({htmlReporter, reportPath: 'test', reuse: true});
        });

        describe('should create valid query string', () => {
            it('if called with no query params', () => {
                sqliteClient.query();

                assert.calledWith(prepareStub, 'SELECT * FROM suites');
            });

            it('if called with "select", "where", "order" and "orderDescending"', () => {
                sqliteClient.query({select: 'foo', where: 'bar', orderBy: 'baz', orderDescending: true, limit: 42});

                assert.calledWith(prepareStub, 'SELECT foo FROM suites WHERE bar ORDER BY baz DESC LIMIT 42');
            });

            it('if "orderDescending" is not specified', () => {
                sqliteClient.query({select: 'foo', orderBy: 'baz'});

                assert.calledWith(prepareStub, 'SELECT foo FROM suites ORDER BY baz ASC');
            });
        });

        it('should apply query arguments', () => {
            sqliteClient.query({}, 'foo', 'bar');

            assert.calledOnceWith(getAsObjectStub, ['foo', 'bar']);
        });

        it('should cache equal queries by default', () => {
            sqliteClient.query({select: 'foo', where: 'bar'});
            sqliteClient.query({select: 'foo', where: 'bar'});

            assert.calledOnce(getAsObjectStub);
        });

        it('should not cache queries if "noCache" is set', () => {
            sqliteClient.query({select: 'foo', noCache: true});
            sqliteClient.query({select: 'foo', noCache: true});

            assert.calledTwice(getAsObjectStub);
        });

        it('should not use cache for different queries', () => {
            sqliteClient.query({select: 'foo', where: 'bar'});
            sqliteClient.query({select: 'foo', where: 'baz'});

            assert.calledTwice(getAsObjectStub);
        });

        it('should not use cache for queries with different args', () => {
            sqliteClient.query({select: 'foo', where: 'bar = ?'}, 'baz');
            sqliteClient.query({select: 'foo', where: 'bar = ?'}, 'qux');

            assert.calledTwice(getAsObjectStub);
        });

        it('should return undefined if record is not found', () => {
            getAsObjectStub.returns({foo: undefined});

            const result = sqliteClient.query({select: 'foo', where: 'bar = ?'}, 'baz');

            assert.isUndefined(result);
        });
    });

    describe('delete', () => {
        let runStub, sqliteClient;

        beforeEach(async () => {
            runStub = sandbox.stub();

            const mockDb = {
                prepare: sandbox.stub(),
                run: runStub,
                close: sandbox.stub(),
                export: sandbox.stub().returns(Buffer.from('mock'))
            };

            sqliteClient = await proxyquire('lib/sqlite-client', {
                './db-utils/common': {createTablesQuery: () => ['CREATE TABLE suites (id INTEGER)']},
                './db-utils/server': {
                    makeSqlDatabaseFromFile: sandbox.stub().resolves(mockDb)
                }
            }).SqliteClient.create({htmlReporter, reportPath: 'test', reuse: true});
        });

        describe('should create valid sentence string', () => {
            it('if called with no query params', () => {
                sqliteClient.delete();

                assert.calledWith(runStub, 'DELETE FROM suites', []);
            });

            it('if called with "where"', () => {
                sqliteClient.delete({where: 'bar'});

                assert.calledWith(runStub, 'DELETE FROM suites WHERE bar', []);
            });
        });

        it('should apply delete arguments', () => {
            sqliteClient.delete({}, 'foo', 'bar');

            assert.calledWith(runStub, 'DELETE FROM suites', ['foo', 'bar']);
        });
    });
});
