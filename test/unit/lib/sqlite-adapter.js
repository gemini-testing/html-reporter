'use strict';

const fs = require('fs-extra');
const proxyquire = require('proxyquire');
const Database = require('better-sqlite3');

const SqliteAdapter = require('lib/sqlite-adapter');
const PluginApi = require('lib/plugin-api');

describe('lib/sqlite-adapter', () => {
    const sandbox = sinon.createSandbox();
    let hermione;

    const makeSqliteAdapter_ = async () => {
        const sqliteAdapter = SqliteAdapter.create({hermione, reportPath: 'test'});
        await sqliteAdapter.init();
        return sqliteAdapter;
    };

    beforeEach(() => {
        hermione = {htmlReporter: PluginApi.create()};
    });

    afterEach(() => {
        fs.unlinkSync('test/sqlite.db');
        sandbox.restore();
    });

    it('should create database', async () => {
        await makeSqliteAdapter_();

        assert.equal(fs.existsSync('test/sqlite.db'), true);
    });

    it('should create database with correct structure', async () => {
        await makeSqliteAdapter_();
        const db = new Database('test/sqlite.db');
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
            {cid: 13, name: 'timestamp', type: 'INT'}
        ];

        const columns = db.prepare('PRAGMA table_info(suites);').all();
        db.close();

        columns.map((column, index) => {
            assert.match(column.cid, tableStructure[index].cid);
            assert.match(column.name, tableStructure[index].name);
            assert.match(column.type, tableStructure[index].type);
        });
    });

    it('should emit "DATABASE_CREATED" event with new database connection', async () => {
        const onDatabaseCreated = sinon.spy();
        hermione.htmlReporter.on(hermione.htmlReporter.events.DATABASE_CREATED, onDatabaseCreated);

        await makeSqliteAdapter_();

        assert.calledOnceWith(onDatabaseCreated, sinon.match.instanceOf(Database));
    });

    describe('query', () => {
        let getStub, prepareStub, sqliteAdapter;

        beforeEach(async () => {
            getStub = sandbox.stub();
            prepareStub = sandbox.stub(Database.prototype, 'prepare').returns({get: getStub});
            sqliteAdapter = proxyquire('lib/sqlite-adapter', {
                './db-utils/server': {createTablesQuery: () => []}
            }).create({hermione, reportPath: 'test'});

            await sqliteAdapter.init();
        });

        describe('should create valid query string', () => {
            it('if called with no query params', () => {
                sqliteAdapter.query();

                assert.calledOnceWith(prepareStub, 'SELECT * FROM suites');
            });

            it('if called with "select", "where", "order" and "orderDescending"', () => {
                sqliteAdapter.query({select: 'foo', where: 'bar', orderBy: 'baz', orderDescending: true});

                assert.calledOnceWith(prepareStub, 'SELECT foo FROM suites WHERE bar ORDER BY baz DESC');
            });

            it('if "orderDescending" is not specified', () => {
                sqliteAdapter.query({select: 'foo', orderBy: 'baz'});

                assert.calledOnceWith(prepareStub, 'SELECT foo FROM suites ORDER BY baz ASC');
            });
        });

        it('should apply query arguments', () => {
            sqliteAdapter.query({}, 'foo', 'bar');

            assert.calledOnceWith(getStub, 'foo', 'bar');
        });

        it('should cache equal queries by default', () => {
            sqliteAdapter.query({select: 'foo', where: 'bar'});
            sqliteAdapter.query({select: 'foo', where: 'bar'});

            assert.calledOnce(getStub);
        });

        it('should not cache queries if "noCache" is set', () => {
            sqliteAdapter.query({select: 'foo', noCache: true});
            sqliteAdapter.query({select: 'foo', noCache: true});

            assert.calledTwice(getStub);
        });

        it('should not use cache for different queries', () => {
            sqliteAdapter.query({select: 'foo', where: 'bar'});
            sqliteAdapter.query({select: 'foo', where: 'baz'});

            assert.calledTwice(getStub);
        });

        it('should not use cache for queries with different args', () => {
            sqliteAdapter.query({select: 'foo', where: 'bar = ?'}, 'baz');
            sqliteAdapter.query({select: 'foo', where: 'bar = ?'}, 'qux');

            assert.calledTwice(getStub);
        });
    });
});
