'use strict';

const SqliteAdapter = require('lib/sqlite-adapter');
const sqlite3 = require('sqlite3').verbose();

describe('lib/sqlite-adapter', () => {
    const sandbox = sinon.createSandbox();
    const savePath = './test';

    beforeEach(() => {
        sandbox.stub(sqlite3, 'Database');
        sandbox.stub(SqliteAdapter.prototype, '_createTable');
    });
    afterEach(() => {
        sandbox.restore();
    });

    it('should create a database on init', () => {
        SqliteAdapter.create(savePath);
        assert.calledWith(sqlite3.Database, 'test/sqlite.db');
    });
});
