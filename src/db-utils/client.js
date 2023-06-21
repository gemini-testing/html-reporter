'use strict';
/* eslint-env browser */

const {isEmpty} = require('lodash');
const commonSqliteUtils = require('./common');
const {fetchFile, normalizeUrls} = require('../common-utils');

const {DB_SUITES_TABLE_NAME, LOCAL_DATABASE_NAME} = require('../constants/database');

function fetchDataFromDatabases(dbJsonUrls) {
    const loadDbJsonUrl = (dbJsonUrl) => fetchFile(dbJsonUrl);
    const prepareUrls = (urls, baseUrl) => normalizeUrls(urls, baseUrl);

    const formatData = (dbJsonUrl, jsonResponseStatus = 'unknown') => {
        return {url: dbJsonUrl, status: jsonResponseStatus, data: null};
    };

    const loadDbUrl = async (dbUrl) => {
        const {data, status} = await fetchFile(dbUrl, {responseType: 'arraybuffer'});

        return {url: dbUrl, status, data};
    };

    return commonSqliteUtils.handleDatabases(dbJsonUrls, {loadDbJsonUrl, prepareUrls, formatData, loadDbUrl});
}

async function mergeDatabases(dataForDbs) {
    const SQL = await window.initSqlJs();

    const fetchedDataArray = dataForDbs.map(data => new Uint8Array(data));
    const connections = fetchedDataArray.map(data => new SQL.Database(data));

    if (connections.length === 0) {
        return null;
    } else if (connections.length === 1) {
        return connections[0];
    }

    const sumOfChunkSizes = fetchedDataArray.reduce((acc, data) => {
        return acc + data.length;
    }, 0);

    const mergedDbConnection = new SQL.Database(undefined, sumOfChunkSizes);
    const dbPaths = connections.map(db => db.filename);

    commonSqliteUtils.mergeTables({db: mergedDbConnection, dbPaths, getExistingTables: (statement) => {
        const tables = [];

        while (statement.step()) {
            tables.push(...statement.get());
        }

        return tables;
    }});

    connections.forEach(db => db.close());

    return mergedDbConnection;
}

async function connectToDatabase(dbUrl) {
    const mainDatabaseUrl = new URL(dbUrl);
    const {data} = await fetchFile(mainDatabaseUrl.href, {
        responseType: 'arraybuffer'
    });

    const SQL = await window.initSqlJs();
    return new SQL.Database(new Uint8Array(data));
}

function getMainDatabaseUrl() {
    return new URL(LOCAL_DATABASE_NAME, window.location.href);
}

function getSuitesTableRows(db) {
    const databaseRows = getTableRows(db, DB_SUITES_TABLE_NAME);

    if (isEmpty(databaseRows)) {
        return;
    }

    return databaseRows.values.sort(commonSqliteUtils.compareDatabaseRowsByTimestamp);
}

function getTableRows(db, tableName) {
    const [databaseRows] = db.exec(commonSqliteUtils.selectAllQuery(tableName));

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
    ...commonSqliteUtils,
    fetchDataFromDatabases,
    mergeDatabases,
    connectToDatabase,
    getMainDatabaseUrl,
    getSuitesTableRows,
    closeDatabase
};
