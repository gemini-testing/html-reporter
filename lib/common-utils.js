'use strict';

const {SUCCESS, FAIL, ERROR, SKIPPED, UPDATED, IDLE, RUNNING, QUEUED} = require('./constants/test-statuses');
const saveFormats = require('./constants/save-formats');
const {DB_MAX_AVAILABLE_PAGE_SIZE, DB_TABLE_NAME, DB_TYPES} = require('./constants/database');

const statusPriority = [
    // non-final
    RUNNING, QUEUED,

    // final
    ERROR, FAIL, UPDATED, SUCCESS, IDLE, SKIPPED
];

exports.isSuccessStatus = (status) => status === SUCCESS;
exports.isFailStatus = (status) => status === FAIL;
exports.isIdleStatus = (status) => status === IDLE;
exports.isErroredStatus = (status) => status === ERROR;
exports.isSkippedStatus = (status) => status === SKIPPED;
exports.isUpdatedStatus = (status) => status === UPDATED;

exports.selectAllQuery = `SELECT * FROM ${DB_TABLE_NAME}`;

exports.dbColumns = [
    {name: 'suitePath', type: DB_TYPES.text},
    {name: 'suiteName', type: DB_TYPES.text},
    {name: 'name', type: DB_TYPES.text},
    {name: 'suiteUrl', type: DB_TYPES.text},
    {name: 'metaInfo', type: DB_TYPES.text},
    {name: 'description', type: DB_TYPES.text},
    {name: 'error', type: DB_TYPES.text},
    {name: 'skipReason', type: DB_TYPES.text},
    {name: 'imagesInfo', type: DB_TYPES.text},
    {name: 'screenshot', type: DB_TYPES.int}, //boolean - 0 or 1
    {name: 'multipleTabs', type: DB_TYPES.int}, //boolean - 0 or 1
    {name: 'status', type: DB_TYPES.text},
    {name: 'timestamp', type: DB_TYPES.int}
];

exports.dbColumnIndexes = exports.dbColumns.reduce((acc, {name}, index) => {
    acc[name] = index;
    return acc;
}, {});

exports.determineStatus = (statuses) => {
    if (!statuses.length) {
        return SUCCESS;
    }

    const set = new Set(statuses);
    for (const status of statusPriority) {
        if (set.has(status)) {
            return status;
        }
    }

    console.error('Unknown statuses: ' + JSON.stringify(statuses));
};

exports.createTableQuery = () => {
    const columns = exports.dbColumns.map(({name, type}) => {
        return `${name} ${type}`;
    }).join(', ');

    return `CREATE TABLE IF NOT EXISTS ${DB_TABLE_NAME} (${columns})`;
};

exports.mergeTablesQueries = (dbPaths) => {
    const queries = [
        `PRAGMA page_size = ${DB_MAX_AVAILABLE_PAGE_SIZE}`,
        exports.createTableQuery()
    ];

    for (const dbPath of dbPaths) {
        queries.push(`ATTACH '${dbPath}' AS attached`);
        queries.push(`INSERT OR IGNORE INTO ${DB_TABLE_NAME} SELECT * FROM attached.${DB_TABLE_NAME}`);
        queries.push('DETACH attached');
    }

    return queries;
};

exports.compareDatabaseRowsByTimestamp = (row1, row2) => {
    return row1[exports.dbColumnIndexes.timestamp] - row2[exports.dbColumnIndexes.timestamp];
};

exports.isSqlite = saveFormat => saveFormat === saveFormats.SQLITE;

