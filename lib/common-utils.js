'use strict';

const {SUCCESS, FAIL, ERROR, SKIPPED, UPDATED, IDLE, RUNNING, QUEUED} = require('./constants/test-statuses');
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

exports.determineStatus = (statuses) => {
    const set = new Set(statuses);
    for (const status of statusPriority) {
        if (set.has(status)) {
            return status;
        }
    }

    console.error('Unknown statuses: ' + JSON.stringify(statuses));
};

exports.createTableQuery = () => {
    const columns = [
        'suitePath TEXT',
        'suiteName TEXT',
        'name TEXT',
        'suiteUrl TEXT',
        'metaInfo TEXT',
        'description TEXT',
        'error TEXT',
        'skipReason TEXT',
        'imagesInfo TEXT',
        'screenshot INT', //boolean - 0 or 1
        'multipleTabs INT', //boolean - 0 or 1
        'status TEXT',
        'timestamp INT'
    ].join(', ');

    return 'CREATE TABLE suites (' + columns + ')';
};
