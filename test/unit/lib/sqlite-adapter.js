'use strict';

const fs = require('fs-extra');
const sqlite3 = require('sqlite3').verbose();

const SqliteAdapter = require('lib/sqlite-adapter');

describe('lib/sqlite-adapter', () => {
    const sandbox = sinon.createSandbox();

    const makeSqliteAdapter_ = () => {
        return SqliteAdapter.create('test');
    };

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
        const db = new sqlite3.Database('test/sqlite.db');
        const tableStructure = [
            {cid: 0, name: 'suitePath', type: 'TEXT'},
            {cid: 1, name: 'suiteName', type: 'TEXT'},
            {cid: 2, name: 'name', type: 'TEXT'},
            {cid: 3, name: 'suiteUrl', type: 'TEXT'},
            {cid: 4, name: 'metaInfo', type: 'TEXT'},
            {cid: 5, name: 'description', type: 'TEXT'},
            {cid: 6, name: 'error', type: 'TEXT'},
            {cid: 7, name: 'skipReason', type: 'TEXT'},
            {cid: 8, name: 'imagesInfo', type: 'TEXT'},
            {cid: 9, name: 'screenshot', type: 'INT'},
            {cid: 10, name: 'multipleTabs', type: 'INT'},
            {cid: 11, name: 'status', type: 'TEXT'},
            {cid: 12, name: 'timestamp', type: 'INT'}
        ];

        db.all('PRAGMA table_info(suites);', function(err, columns) {
            db.close();

            columns.map((column, index) => {
                assert.match(column.cid, tableStructure[index].cid);
                assert.match(column.name, tableStructure[index].name);
                assert.match(column.type, tableStructure[index].type);
            });
        });
    });
});
