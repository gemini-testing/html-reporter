'use strict';

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const debug = require('debug')('html-reporter:sqlite-adapter');
const NestedError = require('nested-error-stacks');

const {createTableQuery} = require('./common-utils');
const constantFileNames = require('./constants/file-names');

module.exports = class SqliteAdapter {
    static async create(savePath) {
        const sqliteAdapter = new this();
        await sqliteAdapter.init(savePath);
        return sqliteAdapter;
    }

    constructor() {
        this._dbConn = null;
    }

    _createDbConnection(savePath) {
        const dbPath = path.join(savePath, constantFileNames.LOCAL_DATABASE_NAME);

        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath, err => {
                if (err) {
                    return reject(new NestedError(`Error creating database at "${dbPath}"`, err));
                }
                resolve(db);
            });
        });
    }

    async init(savePath) {
        this._dbConn = await this._createDbConnection(savePath);
        debug('db connection opened');
        await this._createTable();
    }

    close() {
        debug('db connection closed');
        return this._dbConn.close();
    }

    write(testResult) {
        const testResultObj = this._parseTestResult(testResult);
        const values = this._createValuesArray(testResultObj);
        this.insert(values);
    }

    _parseTestResult(result) {
        const {suitePath, suiteName} = result;
        const {
            name, suiteUrl, metaInfo, description, error,
            skipReason, imagesInfo, screenshot, multipleTabs, status
        } = result.testResult;

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
        return Object.keys(testResult).reduce((acc, curr) => {
            const value = testResult[curr];
            if (value === undefined || value === null) {
                acc.push(null);
                return acc;
            }
            switch (value.constructor) {
                case Array:
                case Object:
                    acc.push(JSON.stringify(value));
                    break;
                case Boolean:
                    acc.push(value ? 1 : 0);
                    break;
                default:
                    acc.push(value);
            }
            return acc;
        }, []);
    }

    _runQuery(query, values) {
        return new Promise((resolve, reject) => {
            this._dbConn.run(query, values, err => {
                if (err) {
                    return reject(new NestedError(`Error while running query: "${query}"`, err));
                }
                resolve();
            });
        });
    }

    insert(values) {
        const placeholders = values.map(() => '?').join(', ');
        this._runQuery(`INSERT INTO suites VALUES (${placeholders})`, values);
    }

    async _createTable() {
        await this._runQuery('DROP TABLE IF EXISTS suites');
        await this._runQuery('VACUUM'); // shrinks the db size after dropping the table
        await this._runQuery(createTableQuery());
    }
};
