'use strict';

const {SUCCESS, FAIL, ERROR, SKIPPED, UPDATED, IDLE} = require('./constants/test-statuses');

exports.isSuccessStatus = (status) => status === SUCCESS;
exports.isFailStatus = (status) => status === FAIL;
exports.isIdleStatus = (status) => status === IDLE;
exports.isErroredStatus = (status) => status === ERROR;
exports.isSkippedStatus = (status) => status === SKIPPED;
exports.isUpdatedStatus = (status) => status === UPDATED;
