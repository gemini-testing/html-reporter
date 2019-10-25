'use strict';

const {sortByTimeStamp} = require('./utils');
const columns = require('./db-column-names');

function getDatabaseRows(db) {
    const databaseRows = db.exec('select * from suites')[0];
    if (!databaseRows) {
        console.error('Database is empty or is opened somewhere else');
        return [];
    }
    return databaseRows.values.sort(sortByTimeStamp);
}

function formatTestAttempt(attempt) {
    return {
        suitePath: JSON.parse(attempt[columns.suitePath]),
        name: JSON.parse(attempt[columns.suitePath])[0],
        children: [{
            name: attempt[columns.suiteName],
            status: attempt[columns.status],
            suitePath: JSON.parse(attempt[columns.suitePath]),
            browsers: [
                {
                    name: attempt[columns.name],
                    result: {
                        attempt: attempt[columns.timestamp],
                        description: attempt[columns.description],
                        imagesInfo: JSON.parse(attempt[columns.imagesInfo]),
                        metaInfo: JSON.parse(attempt[columns.metaInfo]),
                        multipleTabs: attempt[columns.multipleTabs] === 1,
                        name: attempt[columns.name],
                        screenshot: attempt[columns.screenshot] === 1,
                        status: attempt[columns.status],
                        suiteUrl: attempt[columns.suiteUrl],
                        skipReason: attempt[columns.skipReason],
                        error: JSON.parse(attempt[columns.error])
                    },
                    retries: []
                }
            ]
        }],
        status: attempt[columns.status]
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
