'use strict';
/* eslint-env browser */

import {isEmpty} from 'lodash';
/** @type Record<string, (...args: unknown[]) => unknown> */
import commonSqliteUtils, {handleDatabases, mergeTables, compareDatabaseRowsByTimestamp, selectAllQuery} from './common';
import {fetchFile, normalizeUrls} from '../common-utils';

import {DB_SUITES_TABLE_NAME, LOCAL_DATABASE_NAME} from '../constants/database';

export function fetchDataFromDatabases(dbJsonUrls, onDownloadProgress) {
    const loadDbJsonUrl = (dbJsonUrl) => fetchFile(dbJsonUrl);
    const prepareUrls = (urls, baseUrl) => normalizeUrls(urls, baseUrl);

    const formatData = (dbJsonUrl, jsonResponseStatus = 'unknown') => {
        return {url: dbJsonUrl, status: jsonResponseStatus, data: null};
    };

    const loadDbUrl = async (dbUrl) => {
        const loadOptions = {responseType: 'arraybuffer'};

        if (typeof onDownloadProgress === 'function') {
            loadOptions.onDownloadProgress = (e) => {
                onDownloadProgress(dbUrl, e.loaded / e.total);
            };
        }

        const {data, status} = await fetchFile(dbUrl, loadOptions);

        return {url: dbUrl, status, data};
    };

    return handleDatabases(dbJsonUrls, {loadDbJsonUrl, prepareUrls, formatData, loadDbUrl});
}

export async function mergeDatabases(dataForDbs) {
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

    mergeTables({db: mergedDbConnection, dbPaths, getExistingTables: (statement) => {
        const tables = [];

        while (statement.step()) {
            tables.push(...statement.get());
        }

        return tables;
    }});

    connections.forEach(db => db.close());

    return mergedDbConnection;
}

export async function connectToDatabase(dbUrl) {
    const mainDatabaseUrl = new URL(dbUrl);
    const {data} = await fetchFile(mainDatabaseUrl.href, {
        responseType: 'arraybuffer'
    });

    const SQL = await window.initSqlJs();
    return new SQL.Database(new Uint8Array(data));
}

export function getMainDatabaseUrl() {
    return new URL(LOCAL_DATABASE_NAME, window.location.href);
}

export function getSuitesTableRows(db) {
    const databaseRows = getTableRows(db, DB_SUITES_TABLE_NAME);

    if (isEmpty(databaseRows)) {
        return;
    }

    return databaseRows.values.sort(compareDatabaseRowsByTimestamp);
}

export function getTableRows(db, tableName) {
    const [databaseRows] = db.exec(selectAllQuery(tableName));

    if (!databaseRows) {
        console.warn(`Table "${tableName}" is empty`);

        return [];
    }

    return databaseRows;
}

export function closeDatabase(db) {
    db.close();
}

export * from './common';
export default {
    ...commonSqliteUtils,
    fetchDataFromDatabases,
    mergeDatabases,
    connectToDatabase,
    getMainDatabaseUrl,
    getSuitesTableRows,
    closeDatabase
};
