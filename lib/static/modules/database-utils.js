'use strict';

const {selectAllQuery, compareDatabaseRowsByTimestamp, dbColumnIndexes} = require('../../common-utils');

function getDatabaseRows(db) {
    const [databaseRows] = db.exec(selectAllQuery);
    if (!databaseRows) {
        console.warn('Database is empty');
        return [];
    }

    return databaseRows.values.sort(compareDatabaseRowsByTimestamp);
}

function formatTestAttempt(attempt) {
    const attemptSuitePath = JSON.parse(attempt[dbColumnIndexes.suitePath]);
    return {
        suitePath: attemptSuitePath,
        name: attemptSuitePath[0],
        children: [{
            name: attempt[dbColumnIndexes.suiteName],
            status: attempt[dbColumnIndexes.status],
            suitePath: attemptSuitePath,
            browsers: [
                {
                    name: attempt[dbColumnIndexes.name],
                    result: {
                        // timestamp corresponds to attempt number -- every next test retry will have bigger
                        // timestamp (just like every next test retry has bigger attempt number)
                        attempt: attempt[dbColumnIndexes.timestamp],
                        description: attempt[dbColumnIndexes.description],
                        imagesInfo: JSON.parse(attempt[dbColumnIndexes.imagesInfo]),
                        metaInfo: JSON.parse(attempt[dbColumnIndexes.metaInfo]),
                        multipleTabs: Boolean(attempt[dbColumnIndexes.multipleTabs]),
                        name: attempt[dbColumnIndexes.name],
                        screenshot: Boolean(attempt[dbColumnIndexes.screenshot]),
                        status: attempt[dbColumnIndexes.status],
                        suiteUrl: attempt[dbColumnIndexes.suiteUrl],
                        skipReason: attempt[dbColumnIndexes.skipReason],
                        error: JSON.parse(attempt[dbColumnIndexes.error])
                    },
                    retries: []
                }
            ]
        }],
        status: attempt[dbColumnIndexes.status]
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
