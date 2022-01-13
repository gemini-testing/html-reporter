'use strict';

const _ = require('lodash');
const {logger} = require('../common-utils');
const {DB_MAX_AVAILABLE_PAGE_SIZE, DB_SUITES_TABLE_NAME, SUITES_TABLE_COLUMNS, DB_COLUMN_INDEXES} = require('../constants/database');

exports.selectAllQuery = (tableName) => `SELECT * FROM ${tableName}`;
exports.selectAllSuitesQuery = () => exports.selectAllQuery(DB_SUITES_TABLE_NAME);

exports.createTablesQuery = () => [
    createTableQuery(DB_SUITES_TABLE_NAME, SUITES_TABLE_COLUMNS)
];

exports.compareDatabaseRowsByTimestamp = (row1, row2) => {
    return row1[DB_COLUMN_INDEXES.timestamp] - row2[DB_COLUMN_INDEXES.timestamp];
};

exports.handleDatabases = async (dbJsonUrls, opts = {}) => {
    return _.flattenDeep(
        await Promise.all(
            dbJsonUrls.map(async dbJsonUrl => {
                try {
                    const currentJsonResponse = await opts.loadDbJsonUrl(dbJsonUrl);

                    if (!currentJsonResponse.data) {
                        logger.warn(`Cannot get data from ${dbJsonUrl}`);

                        return opts.formatData ? opts.formatData(dbJsonUrl, currentJsonResponse.status) : [];
                    }

                    // JSON format declare at lib/static/modules/actions.js
                    const {dbUrls, jsonUrls} = currentJsonResponse.data;

                    // paths from databaseUrls.json may be relative or absolute
                    const preparedDbUrls = opts.prepareUrls(dbUrls, dbJsonUrl);
                    const preparedDbJsonUrls = opts.prepareUrls(jsonUrls, dbJsonUrl);

                    return await Promise.all([
                        exports.handleDatabases(preparedDbJsonUrls, opts),
                        ...preparedDbUrls.map(dbUrl => opts.loadDbUrl(dbUrl, opts))
                    ]);
                } catch (e) {
                    logger.warn(`Error while downloading databases from ${dbJsonUrl}`, e);

                    return opts.formatData ? opts.formatData(dbJsonUrl) : [];
                }
            }),
        ),
    );
};

exports.mergeTables = ({db, dbPaths, getExistingTables = () => {}}) => {
    db.prepare(`PRAGMA page_size = ${DB_MAX_AVAILABLE_PAGE_SIZE}`).run();

    for (const dbPath of dbPaths) {
        db.prepare(`ATTACH DATABASE '${dbPath}' AS attached`).run();

        const getTablesStatement = db.prepare(`SELECT name FROM attached.sqlite_master WHERE type='table'`);
        const tables = getExistingTables(getTablesStatement);

        for (const tableName of tables) {
            db.prepare(`CREATE TABLE IF NOT EXISTS ${tableName} AS SELECT * FROM attached.${tableName} LIMIT 0`).run();
            db.prepare(`INSERT OR IGNORE INTO ${tableName} SELECT * FROM attached.${tableName}`).run();
        }

        db.prepare(`DETACH attached`).run();
    }
};

function createTableQuery(tableName, columns) {
    const formattedColumns = columns
        .map(({name, type}) => `${name} ${type}`)
        .join(', ');

    return `CREATE TABLE IF NOT EXISTS ${tableName} (${formattedColumns})`;
}
