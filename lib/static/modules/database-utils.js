'use strict';

const {sortByTimeStamp} = require('./utils');
const dbColumnNames = require('./db-column-names');

function getDatabaseRows(db) {
    const databaseRows = db.exec('select * from suites')[0];
    if (!databaseRows) {
        console.warn('Database is empty');
        return [];
    }
    return databaseRows.values.sort(sortByTimeStamp);
}

function formatTestAttempt(attempt) {
    const attemptSuitePath = JSON.parse(attempt[dbColumnNames.suitePath]);
    return {
        suitePath: attemptSuitePath,
        name: attemptSuitePath[0],
        children: [{
            name: attempt[dbColumnNames.suiteName],
            status: attempt[dbColumnNames.status],
            suitePath: attemptSuitePath,
            browsers: [
                {
                    name: attempt[dbColumnNames.name],
                    result: {
                        // timestamp corresponds to attempt number -- every next test retry will have bigger
                        // timestamp (just like every next test retry has bigger attempt number)
                        attempt: attempt[dbColumnNames.timestamp],
                        description: attempt[dbColumnNames.description],
                        imagesInfo: JSON.parse(attempt[dbColumnNames.imagesInfo]),
                        metaInfo: JSON.parse(attempt[dbColumnNames.metaInfo]),
                        multipleTabs: Boolean(attempt[dbColumnNames.multipleTabs]),
                        name: attempt[dbColumnNames.name],
                        screenshot: Boolean(attempt[dbColumnNames.screenshot]),
                        status: attempt[dbColumnNames.status],
                        suiteUrl: attempt[dbColumnNames.suiteUrl],
                        skipReason: attempt[dbColumnNames.skipReason],
                        error: JSON.parse(attempt[dbColumnNames.error])
                    },
                    retries: []
                }
            ]
        }],
        status: attempt[dbColumnNames.status]
    };
}

function closeDatabase(db) {
    db.close();
}

module.exports = {
    getDatabaseRows,
    formatTestAttempt,
    closeDatabase
};
