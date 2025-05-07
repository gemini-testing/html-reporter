'use strict';

const fs = require('fs-extra');
const proxyquire = require('proxyquire');
const Database = require('better-sqlite3');

const {SqliteClient} = require('lib/sqlite-client');
const {HtmlReporter} = require('lib/plugin-api');

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
        fs.unlinkSync('test/sqlite.db');
        sandbox.restore();
    });

    it('should create database', async () => {
        await makeSqliteClient_();

        assert.equal(fs.existsSync('test/sqlite.db'), true);
    });

    it('should create database with correct structure', async () => {
        await makeSqliteClient_();
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
            {cid: 13, name: 'timestamp', type: 'INT'},
            {cid: 14, name: 'duration', type: 'INT'},
            {cid: 15, name: 'attachments', type: 'TEXT'}
        ];

        const columns = db.prepare('PRAGMA table_info(suites);').all();
        db.close();

        columns.map((column, index) => {
            assert.match(column.cid, tableStructure[index].cid);
            assert.match(column.name, tableStructure[index].name);
            assert.match(column.type, tableStructure[index].type);
        });
    });

    describe('query', () => {
        let getStub, prepareStub, sqliteClient;

        beforeEach(async () => {
            getStub = sandbox.stub();
            prepareStub = sandbox.stub(Database.prototype, 'prepare').returns({get: getStub, run: sandbox.stub()});
            sqliteClient = await proxyquire('lib/sqlite-client', {
                './db-utils/common': {createTablesQuery: () => []}
            }).SqliteClient.create({htmlReporter, reportPath: 'test', reuse: true});
        });

        describe('should create valid query string', () => {
            it('if called with no query params', () => {
                sqliteClient.query();

                assert.calledOnceWith(prepareStub, 'SELECT * FROM suites');
            });

            it('if called with "select", "where", "order" and "orderDescending"', () => {
                sqliteClient.query({select: 'foo', where: 'bar', orderBy: 'baz', orderDescending: true, limit: 42});

                assert.calledOnceWith(prepareStub, 'SELECT foo FROM suites WHERE bar ORDER BY baz DESC LIMIT 42');
            });

            it('if "orderDescending" is not specified', () => {
                sqliteClient.query({select: 'foo', orderBy: 'baz'});

                assert.calledOnceWith(prepareStub, 'SELECT foo FROM suites ORDER BY baz ASC');
            });
        });

        it('should apply query arguments', () => {
            sqliteClient.query({}, 'foo', 'bar');

            assert.calledOnceWith(getStub, 'foo', 'bar');
        });

        it('should cache equal queries by default', () => {
            sqliteClient.query({select: 'foo', where: 'bar'});
            sqliteClient.query({select: 'foo', where: 'bar'});

            assert.calledOnce(getStub);
        });

        it('should not cache queries if "noCache" is set', () => {
            sqliteClient.query({select: 'foo', noCache: true});
            sqliteClient.query({select: 'foo', noCache: true});

            assert.calledTwice(getStub);
        });

        it('should not use cache for different queries', () => {
            sqliteClient.query({select: 'foo', where: 'bar'});
            sqliteClient.query({select: 'foo', where: 'baz'});

            assert.calledTwice(getStub);
        });

        it('should not use cache for queries with different args', () => {
            sqliteClient.query({select: 'foo', where: 'bar = ?'}, 'baz');
            sqliteClient.query({select: 'foo', where: 'bar = ?'}, 'qux');

            assert.calledTwice(getStub);
        });
    });

    describe('delete', () => {
        let runStub, prepareStub, sqliteClient;

        beforeEach(async () => {
            runStub = sandbox.stub();
            prepareStub = sandbox.stub(Database.prototype, 'prepare').returns({run: runStub});
            sqliteClient = await proxyquire('lib/sqlite-client', {
                './db-utils/common': {createTablesQuery: () => []}
            }).SqliteClient.create({htmlReporter, reportPath: 'test', reuse: true});
        });

        describe('should create valid sentence string', () => {
            it('if called with no query params', () => {
                sqliteClient.delete();

                assert.calledOnceWith(prepareStub, 'DELETE FROM suites');
            });

            it('if called with "select", "where", "order" and "orderDescending"', () => {
                sqliteClient.delete({where: 'bar', orderBy: 'baz', orderDescending: true, limit: 42});

                assert.calledOnceWith(prepareStub, 'DELETE FROM suites WHERE bar ORDER BY baz DESC LIMIT 42');
            });
        });

        it('should apply delete arguments', () => {
            sqliteClient.delete({}, 'foo', 'bar');

            assert.calledOnceWith(runStub, 'foo', 'bar');
        });
    });
});
