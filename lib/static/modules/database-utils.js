'use strict';

const {isEmpty} = require('lodash');
const {selectAllQuery, compareDatabaseRowsByTimestamp} = require('../../common-utils');
const {DB_SUITES_TABLE_NAME} = require('../../constants/database');

function getSuitesTableRows(db) {
    const databaseRows = getTableRows(db, DB_SUITES_TABLE_NAME);

    if (isEmpty(databaseRows)) {
        return;
    }

    return databaseRows.values.sort(compareDatabaseRowsByTimestamp);
}

function getTableRows(db, tableName) {
    const [databaseRows] = db.exec(selectAllQuery(tableName));

    if (!databaseRows) {
        console.warn(`Table "${tableName}" is empty`);

        return [];
    }

    return databaseRows;
}

function closeDatabase(db) {
    db.close();
}

module.exports = {
    getSuitesTableRows,
    closeDatabase
};
