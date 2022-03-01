'use strict';

const path = require('path');
const fs = require('fs-extra');
const Database = require('better-sqlite3');
const NestedError = require('nested-error-stacks');
const debug = require('debug')('html-reporter:sqlite-adapter');

const {createTablesQuery} = require('./db-utils/server');
const {DB_SUITES_TABLE_NAME, SUITES_TABLE_COLUMNS, LOCAL_DATABASE_NAME, DATABASE_URLS_JSON_NAME} = require('./constants/database');

module.exports = class SqliteAdapter {
    static create(...args) {
        return new SqliteAdapter(...args);
    }

    constructor({hermione, reportPath, reuse = false}) {
        this._hermione = hermione;
        this._reportPath = reportPath;
        this._reuse = reuse;
        this._db = null;
    }

    async init() {
        const dbPath = path.resolve(this._reportPath, LOCAL_DATABASE_NAME);
        const dbUrlsJsonPath = path.resolve(this._reportPath, DATABASE_URLS_JSON_NAME);

        try {
            if (!this._reuse) {
                await Promise.all([
                    fs.remove(dbPath),
                    fs.remove(dbUrlsJsonPath)
                ]);
            }

            await fs.ensureDir(this._reportPath);

            this._db = new Database(dbPath);
            debug('db connection opened');

            createTablesQuery().forEach((query) => this._db.prepare(query).run());

            this._hermione.htmlReporter.emit(this._hermione.htmlReporter.events.DATABASE_CREATED, this._db);
        } catch (err) {
            throw new NestedError(`Error creating database at "${dbPath}"`, err);
        }
    }

    close() {
        this._db.prepare('VACUUM').run();

        debug('db connection closed');
        return this._db.close();
    }

    write(testResult) {
        const testResultObj = this._parseTestResult(testResult);
        const values = this._createValuesArray(testResultObj);

        const placeholders = values.map(() => '?').join(', ');
        this._db.prepare(`INSERT INTO ${DB_SUITES_TABLE_NAME} VALUES (${placeholders})`).run(...values);
    }

    _parseTestResult({suitePath, suiteName, testResult}) {
        const {
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
            timestamp = Date.now()
        } = testResult;

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
            timestamp
        };
    }

    _createValuesArray(testResult) {
        return SUITES_TABLE_COLUMNS.reduce((acc, {name}) => {
            const value = testResult[name];
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
};
