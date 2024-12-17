// TODO: change to enums
export const DB_TYPES = {int: 'INT', text: 'TEXT'} as const;
export const DB_COLUMNS = {
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
    TIMESTAMP: 'timestamp',
    DURATION: 'duration'
} as const;

export const SUITES_TABLE_COLUMNS = [
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
    {name: DB_COLUMNS.TIMESTAMP, type: DB_TYPES.int},
    {name: DB_COLUMNS.DURATION, type: DB_TYPES.int}
] as const;

export const DB_MAX_AVAILABLE_PAGE_SIZE = 65536; // helps to speed up queries
export const DB_SUITES_TABLE_NAME = 'suites';
export const LOCAL_DATABASE_NAME = 'sqlite.db';
export const DATABASE_URLS_JSON_NAME = 'databaseUrls.json';

// Precise numbers instead of just "number" make this possible: row[DB_COLUMN_INDEXES.name] === string
interface DbColumnIndexes {
    [DB_COLUMNS.SUITE_PATH]: 0,
    [DB_COLUMNS.SUITE_NAME]: 1,
    [DB_COLUMNS.NAME]: 2,
    [DB_COLUMNS.SUITE_URL]: 3,
    [DB_COLUMNS.META_INFO]: 4,
    [DB_COLUMNS.HISTORY]: 5,
    [DB_COLUMNS.DESCRIPTION]: 6,
    [DB_COLUMNS.ERROR]: 7,
    [DB_COLUMNS.SKIP_REASON]: 8,
    [DB_COLUMNS.IMAGES_INFO]: 9,
    [DB_COLUMNS.SCREENSHOT]: 10,
    [DB_COLUMNS.MULTIPLE_TABS]: 11,
    [DB_COLUMNS.STATUS]: 12,
    [DB_COLUMNS.TIMESTAMP]: 13,
    [DB_COLUMNS.DURATION]: 14,
}

export const DB_COLUMN_INDEXES = SUITES_TABLE_COLUMNS.reduce((acc: Record<string, number>, {name}, index) => {
    acc[name] = index;
    return acc;
}, {}) as unknown as DbColumnIndexes;
