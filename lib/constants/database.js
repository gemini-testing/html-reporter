'use strict';

const DB_TYPES = {int: 'INT', text: 'TEXT'};
const SUITES_TABLE_COLUMNS = [
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

module.exports = {
    DB_MAX_AVAILABLE_PAGE_SIZE: 65536, // helps to speed up queries
    DB_SUITES_TABLE_NAME: 'suites',
    SUITES_TABLE_COLUMNS,
    LOCAL_DATABASE_NAME: 'sqlite.db',
    DATABASE_URLS_JSON_NAME: 'databaseUrls.json',
    DB_COLUMN_INDEXES: SUITES_TABLE_COLUMNS.reduce((acc, {name}, index) => {
        acc[name] = index;
        return acc;
    }, {})
};
