'use strict';

const SqliteAdapter = require('lib/sqlite-adapter');
const sqlite3 = require('sqlite3').verbose();

describe('lib/sqlite-adapter', () => {
    const sandbox = sinon.createSandbox();
    const config = {path: './test'};
    beforeEach(() => {
        sandbox.stub(sqlite3, 'Database');
        sandbox.stub(SqliteAdapter.prototype, '_createTable');
    });
    afterEach(() => {
        sandbox.restore();
    });

    it('should create a database on init', () => {
        SqliteAdapter.create(config, 'sqlite.db').init();
        assert.calledWith(sqlite3.Database, 'test/sqlite.db');
    });

    it('should create "suites" tables on init', () => {
        SqliteAdapter.create(config, 'sqlite.db').init();
        assert.calledOnce(SqliteAdapter.prototype._createTable);
    });
});
