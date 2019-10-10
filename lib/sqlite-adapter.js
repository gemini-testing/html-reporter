'use strict';

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const debug = require('debug')('html-reporter:sqlite-adapter');
const NestedError = require('nested-error-stacks');

const {createTableQuery} = require('./common-utils');

module.exports = class SqliteAdapter {
    static async create(savePath, dbName) {
        const sqliteAdapter = new this();
        await sqliteAdapter.init(savePath, dbName);
        return sqliteAdapter;
    }

    constructor() {
        this._dbConn = null;
    }

    _createDbConnection(savePath, dbName) {
        const dbPath = path.join(savePath, dbName);

        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath, err => {
                if (err) {
                    return reject(new NestedError('Error creating database', err));
                }
                resolve(db);
            });
        });
    }

    async init(savePath, dbName) {
        this._dbConn = await this._createDbConnection(savePath, dbName);
        debug('db connection opened');
        await this._createTable();
        return this;
    }

    close() {
        debug('db connection closed');
        return this._dbConn.close();
    }

    write(testResult) {
        const testResultObj = this._parseTestResult(testResult);
        const values = this._createValuesArray(testResultObj);
        this._insert(values);
    }

    _parseTestResult(result) {
        const {suitePath, suiteName} = result;
        const {name, suiteUrl, metaInfo, description, error, skipReason, imagesInfo, screenshot, multipleTabs, status} = result.testResult;
        return {
            suitePath,
            suiteName,
            name,
            suiteUrl,
            metaInfo,
            description,
            error,
            skipReason,
            imagesInfo,
            screenshot,
            multipleTabs,
            status,
            timestamp: Date.now()
        };
    }

    _createValuesArray(testResult) {
        const values = [];

        for (const key of Object.keys(testResult)) {
            if (testResult[key] === undefined || testResult[key] === null) {
                values.push(null);
                continue;
            }
            switch (testResult[key].constructor) {
                case Array:
                case Object:
                    values.push(JSON.stringify(testResult[key]));
                    break;
                case Boolean:
                    values.push(testResult[key] ? 1 : 0);
                    break;
                default:
                    values.push(testResult[key]);
            }
        }
        return values;
    }

    _runQuery(query, values) {
        return new Promise((resolve, reject) => {
            this._dbConn.run(query, values, err => {
                if (err) {
                    return reject(new NestedError('Error while running query' + err.message));
                }
                resolve();
            });
        });
    }
    _insert(values) {
        const placeholders = values.map(() => '?').join(', ');
        this._runQuery(`INSERT INTO suites VALUES (${placeholders})`, values);
    }

    async _createTable() {
        await this._runQuery('DROP TABLE IF EXISTS suites');
        await this._runQuery('VACUUM'); // shrinks the db size after dropping the table
        await this._runQuery(createTableQuery());
    }
};
