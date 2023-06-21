'use strict';

const DB_TYPES = {int: 'INT', text: 'TEXT'};
const DB_COLUMNS = {
    SUITE_PATH: 'suitePath',
    SUITE_NAME: 'suiteName',
    NAME: 'name',
    SUITE_URL: 'suiteUrl',
    META_INFO: 'metaInfo',
    HISTORY: 'history',
    DESCRIPTION: 'description',
    ERROR: 'error',
    SKIP_REASON: 'skipReason',
    IMAGES_INFO: 'imagesInfo',
    SCREENSHOT: 'screenshot',
    MULTIPLE_TABS: 'multipleTabs',
    STATUS: 'status',
    TIMESTAMP: 'timestamp'
};

const SUITES_TABLE_COLUMNS = [
    {name: DB_COLUMNS.SUITE_PATH, type: DB_TYPES.text},
    {name: DB_COLUMNS.SUITE_NAME, type: DB_TYPES.text},
    {name: DB_COLUMNS.NAME, type: DB_TYPES.text},
    {name: DB_COLUMNS.SUITE_URL, type: DB_TYPES.text},
    {name: DB_COLUMNS.META_INFO, type: DB_TYPES.text},
    {name: DB_COLUMNS.HISTORY, type: DB_TYPES.text},
    {name: DB_COLUMNS.DESCRIPTION, type: DB_TYPES.text},
    {name: DB_COLUMNS.ERROR, type: DB_TYPES.text},
    {name: DB_COLUMNS.SKIP_REASON, type: DB_TYPES.text},
    {name: DB_COLUMNS.IMAGES_INFO, type: DB_TYPES.text},
    {name: DB_COLUMNS.SCREENSHOT, type: DB_TYPES.int}, //boolean - 0 or 1
    {name: DB_COLUMNS.MULTIPLE_TABS, type: DB_TYPES.int}, //boolean - 0 or 1
    {name: DB_COLUMNS.STATUS, type: DB_TYPES.text},
    {name: DB_COLUMNS.TIMESTAMP, type: DB_TYPES.int}
];

module.exports = {
    DB_MAX_AVAILABLE_PAGE_SIZE: 65536, // helps to speed up queries
    DB_SUITES_TABLE_NAME: 'suites',
    DB_COLUMNS,
    SUITES_TABLE_COLUMNS,
    LOCAL_DATABASE_NAME: 'sqlite.db',
    DATABASE_URLS_JSON_NAME: 'databaseUrls.json',
    DB_COLUMN_INDEXES: SUITES_TABLE_COLUMNS.reduce((acc, {name}, index) => {
        acc[name] = index;
        return acc;
    }, {})
};
